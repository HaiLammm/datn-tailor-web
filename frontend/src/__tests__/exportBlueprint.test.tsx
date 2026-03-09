/**
 * @jest-environment jsdom
 */
/**
 * Story 4.4: ExportBlueprintButton Component Tests
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportBlueprintButton } from "@/components/client/design/ExportBlueprintButton";
import * as actions from "@/app/actions/geometry-actions";

// Mock the server action
jest.mock("@/app/actions/geometry-actions", () => ({
  exportBlueprint: jest.fn(),
}));

describe("Story 4.4: ExportBlueprintButton", () => {
  const designId = "test-design-uuid";
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders locked message when design is not locked", () => {
    render(<ExportBlueprintButton designId={designId} isLocked={false} />);
    
    expect(screen.getByText("Khóa thiết kế để xuất bản vẽ sản xuất")).toBeInTheDocument();
  });

  it("renders export buttons when design is locked", () => {
    render(<ExportBlueprintButton designId={designId} isLocked={true} />);
    
    expect(screen.getByText("Xuất SVG")).toBeInTheDocument();
    expect(screen.getByText("Xuất DXF")).toBeInTheDocument();
  });

  it("calls exportBlueprint action and triggers download for SVG", async () => {
    const mockExport = actions.exportBlueprint as jest.Mock;
    mockExport.mockResolvedValue({ success: true, data: "base64data", filename: "test.svg" });
    
    // Create a real link element but mock its click
    const mockLink = originalCreateElement("a");
    const clickSpy = jest.spyOn(mockLink, "click").mockImplementation(() => {});
    
    // Mock document.createElement to return our mockLink for "a" tags
    const createSpy = jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") return mockLink;
      return originalCreateElement(tagName);
    });

    render(<ExportBlueprintButton designId={designId} isLocked={true} />);
    
    fireEvent.click(screen.getByText("Xuất SVG"));
    
    expect(mockExport).toHaveBeenCalledWith(designId, "svg");
    
    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
      expect(mockLink.download).toBe("test.svg");
      expect(mockLink.href).toContain("data:image/svg+xml;base64,base64data");
    });
    
    createSpy.mockRestore();
  });

  it("calls exportBlueprint action and triggers download for DXF", async () => {
    const mockExport = actions.exportBlueprint as jest.Mock;
    mockExport.mockResolvedValue({ success: true, data: "base64data", filename: "test.dxf" });
    
    const mockLink = originalCreateElement("a");
    const clickSpy = jest.spyOn(mockLink, "click").mockImplementation(() => {});
    const createSpy = jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") return mockLink;
      return originalCreateElement(tagName);
    });

    render(<ExportBlueprintButton designId={designId} isLocked={true} />);
    
    fireEvent.click(screen.getByText("Xuất DXF"));
    
    expect(mockExport).toHaveBeenCalledWith(designId, "dxf");
    
    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
      expect(mockLink.download).toBe("test.dxf");
      expect(mockLink.href).toContain("data:application/dxf;base64,base64data");
    });
    
    createSpy.mockRestore();
  });

  it("displays error message when export fails", async () => {
    const mockExport = actions.exportBlueprint as jest.Mock;
    mockExport.mockResolvedValue({ success: false, error: "Vi phạm ràng buộc vật lý" });
    
    render(<ExportBlueprintButton designId={designId} isLocked={true} />);
    
    fireEvent.click(screen.getByText("Xuất SVG"));
    
    await waitFor(() => {
      expect(screen.getByText("Vi phạm ràng buộc vật lý")).toBeInTheDocument();
    });
  });

  it("shows loading state during export", async () => {
    const mockExport = actions.exportBlueprint as jest.Mock;
    mockExport.mockReturnValue(new Promise(resolve => 
      setTimeout(() => resolve({ success: true, data: "d", filename: "f" }), 50)
    ));
    
    render(<ExportBlueprintButton designId={designId} isLocked={true} />);
    
    fireEvent.click(screen.getByText("Xuất SVG"));
    
    expect(screen.getByRole("button", { name: /Xuất SVG/i })).toBeDisabled();
    // The spinner is a div with animate-spin
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
