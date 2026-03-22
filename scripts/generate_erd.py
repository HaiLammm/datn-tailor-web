#!/usr/bin/env python3
"""
Generate Entity Relationship Diagram (ERD) for Tailor Project.

Reads schema from SQLAlchemy ORM models (no live DB connection needed).

Usage:
    python scripts/generate_erd.py                    # Mermaid (default)
    python scripts/generate_erd.py --format mermaid    # Mermaid ER diagram
    python scripts/generate_erd.py --format dbml       # DBML (dbdiagram.io)
    python scripts/generate_erd.py --format dot        # Graphviz DOT
    python scripts/generate_erd.py --format html       # Interactive HTML page
    python scripts/generate_erd.py --format all        # All formats
"""

from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from pathlib import Path

# ---------------------------------------------------------------------------
# Bootstrap: make `from src.models.db_models import …` resolvable
# ---------------------------------------------------------------------------
BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))

from sqlalchemy import inspect as sa_inspect  # noqa: E402
from src.models.db_models import Base  # noqa: E402  — imports ALL models

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TYPE_MAP = {
    "UUID": "uuid",
    "VARCHAR": "varchar",
    "STRING": "varchar",
    "TEXT": "text",
    "INTEGER": "int",
    "BOOLEAN": "bool",
    "DATE": "date",
    "DATETIME": "timestamp",
    "NUMERIC": "decimal",
    "JSON": "json",
}


def _short_type(sa_type) -> str:
    """Convert SQLAlchemy type to a short human-readable string."""
    raw = type(sa_type).__name__.upper()
    base = TYPE_MAP.get(raw, raw.lower())
    # Attach precision for NUMERIC
    if raw == "NUMERIC" and hasattr(sa_type, "precision") and sa_type.precision:
        return f"decimal({sa_type.precision},{sa_type.scale})"
    if raw in ("VARCHAR", "STRING") and hasattr(sa_type, "length") and sa_type.length:
        return f"varchar({sa_type.length})"
    return base


def _collect_schema():
    """Introspect all ORM models and return a structured dict.

    Returns (tables, fk_list) where:
      tables = { table_name: [ {name, type, pk, nullable, fk_target} … ] }
      fk_list = [ (child_table, child_col, parent_table, parent_col) … ]
    """
    tables: dict[str, list[dict]] = {}
    fk_list: list[tuple[str, str, str, str]] = []

    for mapper in Base.registry.mappers:
        cls = mapper.class_
        tbl = cls.__table__
        tname = tbl.name

        cols = []
        for c in tbl.columns:
            col_info = {
                "name": c.name,
                "type": _short_type(c.type),
                "pk": c.primary_key,
                "nullable": c.nullable,
                "fk_target": None,
            }
            for fk in c.foreign_keys:
                target_table = fk.column.table.name
                target_col = fk.column.name
                col_info["fk_target"] = f"{target_table}.{target_col}"
                fk_list.append((tname, c.name, target_table, target_col))
            cols.append(col_info)

        tables[tname] = cols

    return tables, fk_list


# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------

def gen_mermaid(tables, fk_list) -> str:
    lines = ["erDiagram"]
    for tname in sorted(tables):
        lines.append(f"    {tname} {{")
        for c in tables[tname]:
            kind = "PK" if c["pk"] else ("FK" if c["fk_target"] else "")
            lines.append(f'        {c["type"]} {c["name"]}{" " + kind if kind else ""}')
        lines.append("    }")

    # relationships — deduplicate
    seen = set()
    for child, ccol, parent, pcol in sorted(fk_list):
        key = (parent, child, ccol)
        if key in seen:
            continue
        seen.add(key)
        lines.append(f'    {parent} ||--o{{ {child} : "{ccol}"')

    return "\n".join(lines) + "\n"


def gen_dbml(tables, fk_list) -> str:
    lines = [
        'Project tailor_project {',
        '  database_type: "PostgreSQL"',
        '  Note: "Tailor Management System — Multi-tenant SaaS"',
        '}',
        '',
    ]
    for tname in sorted(tables):
        lines.append(f"Table {tname} {{")
        for c in tables[tname]:
            parts = []
            if c["pk"]:
                parts.append("pk")
            if not c["nullable"]:
                parts.append("not null")
            if c["fk_target"]:
                parts.append(f'ref: > {c["fk_target"]}')
            suffix = f' [{", ".join(parts)}]' if parts else ""
            lines.append(f'  {c["name"]} {c["type"]}{suffix}')
        lines.append("}")
        lines.append("")

    return "\n".join(lines) + "\n"


def gen_dot(tables, fk_list) -> str:
    """Generate a Graphviz DOT diagram with record-shaped table nodes."""
    lines = [
        "digraph ERD {",
        '  graph [rankdir=LR fontname="Helvetica" fontsize=12 bgcolor="#f8f9fa"];',
        '  node  [shape=none fontname="Helvetica" fontsize=10];',
        '  edge  [color="#666666" arrowsize=0.8 fontname="Helvetica" fontsize=8];',
        "",
    ]

    # ---- table nodes (HTML-label) ----
    for tname in sorted(tables):
        cols = tables[tname]
        rows = ""
        for c in cols:
            pk_marker = "PK " if c["pk"] else ""
            fk_marker = "FK " if c["fk_target"] else ""
            marker = pk_marker or fk_marker
            color = "#d9534f" if c["pk"] else ("#5cb85c" if c["fk_target"] else "#333")
            rows += (
                f'<TR>'
                f'<TD ALIGN="LEFT"><FONT COLOR="{color}"><B>{marker}</B></FONT>{c["name"]}</TD>'
                f'<TD ALIGN="LEFT"><FONT COLOR="#888">{c["type"]}</FONT></TD>'
                f'</TR>\n'
            )
        label = (
            f'<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4">'
            f'<TR><TD COLSPAN="2" BGCOLOR="#1A2B4C"><FONT COLOR="white"><B>{tname}</B></FONT></TD></TR>\n'
            f'{rows}'
            f'</TABLE>>'
        )
        lines.append(f'  {tname} [label={label}];')

    lines.append("")

    # ---- edges ----
    seen = set()
    for child, ccol, parent, pcol in sorted(fk_list):
        key = (child, ccol)
        if key in seen:
            continue
        seen.add(key)
        lines.append(f'  {child} -> {parent} [label="{ccol}"];')

    lines.append("}")
    return "\n".join(lines) + "\n"


def gen_html(tables, fk_list) -> str:
    """Generate a self-contained interactive HTML schema browser."""
    n_tables = len(tables)
    n_cols = sum(len(v) for v in tables.values())
    n_fks = len(set((c, cc) for c, cc, p, pc in fk_list))

    # --- build FK lookup for badges ---
    fk_lookup: dict[tuple[str, str], str] = {}
    for child, ccol, parent, pcol in fk_list:
        fk_lookup[(child, ccol)] = f"{parent}.{pcol}"

    # --- group tables by domain ---
    groups: dict[str, list[str]] = {
        "Auth & Users": ["users", "staff_whitelist", "otp_codes"],
        "Tenants": ["tenants"],
        "Customers & Profiles": ["customer_profiles", "measurements"],
        "Designs": ["designs", "design_overrides"],
        "Garments": ["garments"],
        "Orders & Payments": ["orders", "order_items", "payment_transactions"],
        "Appointments": ["appointments"],
        "Rentals": ["rental_returns"],
        "Production": ["tailor_tasks"],
        "Vouchers": ["vouchers", "user_vouchers"],
        "CRM": ["leads", "lead_conversions"],
        "Notifications": ["notifications"],
    }
    # Catch any table not explicitly grouped
    grouped = {t for ts in groups.values() for t in ts}
    ungrouped = sorted(set(tables.keys()) - grouped)
    if ungrouped:
        groups["Other"] = ungrouped

    # --- HTML ---
    table_cards = ""
    toc_items = ""
    for group_name, tnames in groups.items():
        present = [t for t in tnames if t in tables]
        if not present:
            continue
        gid = group_name.lower().replace(" ", "-").replace("&", "")
        toc_items += f'<li><a href="#{gid}">{group_name} ({len(present)})</a></li>\n'
        table_cards += f'<h2 id="{gid}" class="group-title">{group_name}</h2>\n'
        for tname in present:
            cols = tables[tname]
            rows_html = ""
            for c in cols:
                badges = ""
                if c["pk"]:
                    badges += '<span class="badge pk">PK</span> '
                if (tname, c["name"]) in fk_lookup:
                    target = fk_lookup[(tname, c["name"])]
                    badges += f'<span class="badge fk">FK &rarr; {target}</span> '
                if not c["nullable"] and not c["pk"]:
                    badges += '<span class="badge nn">NOT NULL</span> '
                rows_html += (
                    f'<tr>'
                    f'<td class="col-name">{c["name"]}</td>'
                    f'<td class="col-type">{c["type"]}</td>'
                    f'<td>{badges or "&mdash;"}</td>'
                    f'</tr>\n'
                )
            table_cards += f'''<div class="card" id="tbl-{tname}">
  <div class="card-header">{tname} <span class="col-count">({len(cols)} cols)</span></div>
  <table>
    <thead><tr><th>Column</th><th>Type</th><th>Constraints</th></tr></thead>
    <tbody>{rows_html}</tbody>
  </table>
</div>
'''

    html = f'''<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tailor Project &mdash; Database ERD</title>
<style>
  :root {{
    --bg: #f0f2f5; --card: #fff; --accent: #667eea;
    --accent2: #764ba2; --border: #e0e0e0; --text: #333;
  }}
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
         background:var(--bg); color:var(--text); }}
  header {{
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color:#fff; padding:48px 20px; text-align:center;
  }}
  header h1 {{ font-size:2.4em; }}
  header p {{ opacity:.85; margin-top:8px; }}
  .stats {{
    display:flex; justify-content:center; gap:48px; padding:24px 16px;
    background:var(--card); border-bottom:1px solid var(--border);
  }}
  .stat-n {{ font-size:2.2em; font-weight:700; color:var(--accent); }}
  .stat-l {{ font-size:.85em; color:#888; }}
  .container {{ max-width:1200px; margin:0 auto; padding:24px 16px; }}
  .toc {{ background:var(--card); border-radius:8px; padding:20px 24px;
          margin-bottom:32px; border:1px solid var(--border); }}
  .toc h3 {{ margin-bottom:12px; color:var(--accent); }}
  .toc ul {{ list-style:none; display:flex; flex-wrap:wrap; gap:8px 24px; }}
  .toc a {{ color:var(--accent); text-decoration:none; font-size:.95em; }}
  .toc a:hover {{ text-decoration:underline; }}
  .group-title {{
    margin:36px 0 16px; padding-bottom:8px;
    border-bottom:2px solid var(--accent); color:var(--accent); font-size:1.4em;
  }}
  .card {{
    background:var(--card); border-radius:8px; margin-bottom:20px;
    box-shadow:0 1px 4px rgba(0,0,0,.08); overflow:hidden;
  }}
  .card-header {{
    padding:14px 18px; font-weight:600; font-size:1.05em;
    border-bottom:2px solid var(--accent); background:#fafafa;
  }}
  .col-count {{ font-weight:400; color:#999; font-size:.85em; }}
  table {{ width:100%; border-collapse:collapse; }}
  th {{ background:#f5f6f8; text-align:left; padding:10px 14px;
       font-size:.82em; text-transform:uppercase; color:#666; letter-spacing:.5px; }}
  td {{ padding:9px 14px; border-top:1px solid #eee; font-size:.92em; }}
  tr:hover td {{ background:#f9f9fb; }}
  .col-name {{ font-family:SFMono-Regular,Consolas,monospace; font-weight:500; }}
  .col-type {{ font-family:SFMono-Regular,Consolas,monospace; color:#666; }}
  .badge {{
    display:inline-block; padding:2px 7px; border-radius:3px;
    font-size:.78em; font-weight:600; margin-right:4px;
  }}
  .badge.pk {{ background:#fef3e7; color:#d9534f; }}
  .badge.fk {{ background:#e8f5e9; color:#388e3c; }}
  .badge.nn {{ background:#f3e5f5; color:#7b1fa2; }}
  footer {{ text-align:center; padding:32px; color:#999; font-size:.85em; }}
  @media(max-width:600px) {{
    .stats {{ flex-direction:column; align-items:center; gap:16px; }}
    .toc ul {{ flex-direction:column; }}
  }}
</style>
</head>
<body>
<header>
  <h1>Tailor Project &mdash; Database ERD</h1>
  <p>Multi-tenant SaaS &bull; PostgreSQL &bull; {n_tables} tables</p>
</header>
<div class="stats">
  <div style="text-align:center"><div class="stat-n">{n_tables}</div><div class="stat-l">Tables</div></div>
  <div style="text-align:center"><div class="stat-n">{n_cols}</div><div class="stat-l">Columns</div></div>
  <div style="text-align:center"><div class="stat-n">{n_fks}</div><div class="stat-l">Foreign Keys</div></div>
</div>
<div class="container">
  <div class="toc"><h3>Table of Contents</h3><ul>{toc_items}</ul></div>
  {table_cards}
</div>
<footer>
  Generated by <code>scripts/generate_erd.py</code> &bull; Tailor Project
</footer>
</body>
</html>
'''
    return html


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

FORMATS = {
    "mermaid": ("erd.mmd", gen_mermaid),
    "dbml":    ("erd.dbml", gen_dbml),
    "dot":     ("erd.dot", gen_dot),
    "html":    ("schema.html", gen_html),
}


def main():
    parser = argparse.ArgumentParser(description="Generate ERD from ORM models")
    parser.add_argument(
        "--format", "-f",
        choices=[*FORMATS.keys(), "all"],
        default="mermaid",
    )
    parser.add_argument("--output-dir", "-o", default="_bmad-output")
    args = parser.parse_args()

    tables, fk_list = _collect_schema()
    print(f"Found {len(tables)} tables, {len(fk_list)} foreign keys\n")

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    targets = FORMATS.keys() if args.format == "all" else [args.format]
    for fmt in targets:
        filename, gen_fn = FORMATS[fmt]
        content = gen_fn(tables, fk_list)
        path = out_dir / filename
        path.write_text(content)
        print(f"  {fmt:8s} -> {path}  ({len(content):,} bytes)")

    print("\nDone.")


if __name__ == "__main__":
    main()
