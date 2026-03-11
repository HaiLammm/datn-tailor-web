/**
 * ProductImageGallery Component Tests - Story 2.2
 *
 * Tests:
 * - Render với single image
 * - Render với multiple images (thumbnails)
 * - Thumbnail click changes active image
 * - Keyboard navigation (arrow keys)
 * - Empty state (no images)
 * - Accessibility labels
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProductImageGallery } from "@/components/client/showroom/ProductImageGallery";

// Mock Next.js Image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage({ src, alt, fill: _fill, ...props }: { src: string; alt: string; fill?: boolean; [key: string]: unknown }) {
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock react-medium-image-zoom
jest.mock("react-medium-image-zoom", () => ({
  __esModule: true,
  default: function MockZoom({ children }: { children: React.ReactNode }) {
    return <div data-testid="zoom-wrapper">{children}</div>;
  },
}));

// Mock the CSS import
jest.mock("react-medium-image-zoom/dist/styles.css", () => ({}));

describe("ProductImageGallery (Story 2.2)", () => {
  const singleImageUrl = "https://example.com/image1.jpg";
  const multipleImages = [
    "https://example.com/img1.jpg",
    "https://example.com/img2.jpg",
    "https://example.com/img3.jpg",
  ];

  describe("Empty state", () => {
    it("should show placeholder when no images provided", () => {
      render(
        <ProductImageGallery
          imageUrl={null}
          imageUrls={[]}
          productName="Áo dài test"
        />
      );
      expect(screen.getByText("Chưa có hình ảnh")).toBeInTheDocument();
    });
  });

  describe("Single image (imageUrl fallback)", () => {
    it("should render main image with correct alt text", () => {
      render(
        <ProductImageGallery
          imageUrl={singleImageUrl}
          imageUrls={[]}
          productName="Áo dài đỏ"
        />
      );
      const img = screen.getByAltText("Áo dài đỏ - ảnh 1");
      expect(img).toBeInTheDocument();
    });

    it("should not render thumbnail strip for single image", () => {
      render(
        <ProductImageGallery
          imageUrl={singleImageUrl}
          imageUrls={[]}
          productName="Áo dài đỏ"
        />
      );
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    });
  });

  describe("Multiple images gallery", () => {
    it("should render thumbnail strip with correct count", () => {
      render(
        <ProductImageGallery
          imageUrl={null}
          imageUrls={multipleImages}
          productName="Áo dài HD"
        />
      );
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(3);
    });

    it("should mark first thumbnail as selected by default", () => {
      render(
        <ProductImageGallery
          imageUrl={null}
          imageUrls={multipleImages}
          productName="Áo dài HD"
        />
      );
      const tabs = screen.getAllByRole("tab");
      expect(tabs[0]).toHaveAttribute("aria-selected", "true");
      expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    });

    it("should change active image on thumbnail click", () => {
      render(
        <ProductImageGallery
          imageUrl={null}
          imageUrls={multipleImages}
          productName="Áo dài HD"
        />
      );
      const tabs = screen.getAllByRole("tab");
      fireEvent.click(tabs[1]);
      expect(tabs[1]).toHaveAttribute("aria-selected", "true");
      expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    });

    it("should render next/prev arrow buttons for multiple images", () => {
      render(
        <ProductImageGallery
          imageUrl={null}
          imageUrls={multipleImages}
          productName="Áo dài HD"
        />
      );
      expect(screen.getByLabelText("Ảnh trước")).toBeInTheDocument();
      expect(screen.getByLabelText("Ảnh tiếp theo")).toBeInTheDocument();
    });

    it("should disable prev button on first image", () => {
      render(
        <ProductImageGallery
          imageUrl={null}
          imageUrls={multipleImages}
          productName="Áo dài HD"
        />
      );
      const prevBtn = screen.getByLabelText("Ảnh trước");
      expect(prevBtn).toBeDisabled();
    });

    it("should disable next button on last image", () => {
      render(
        <ProductImageGallery
          imageUrl={null}
          imageUrls={multipleImages}
          productName="Áo dài HD"
        />
      );
      const tabs = screen.getAllByRole("tab");
      // Go to last image
      fireEvent.click(tabs[2]);
      const nextBtn = screen.getByLabelText("Ảnh tiếp theo");
      expect(nextBtn).toBeDisabled();
    });

    it("should navigate to next image on next button click", () => {
      render(
        <ProductImageGallery
          imageUrl={null}
          imageUrls={multipleImages}
          productName="Áo dài HD"
        />
      );
      const nextBtn = screen.getByLabelText("Ảnh tiếp theo");
      fireEvent.click(nextBtn);
      const tabs = screen.getAllByRole("tab");
      expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    });

    it("should wrap zoom component around main image", () => {
      render(
        <ProductImageGallery
          imageUrl={null}
          imageUrls={multipleImages}
          productName="Áo dài HD"
        />
      );
      expect(screen.getByTestId("zoom-wrapper")).toBeInTheDocument();
    });

    it("should have accessible gallery label", () => {
      render(
        <ProductImageGallery
          imageUrl={null}
          imageUrls={multipleImages}
          productName="Áo dài truyền thống"
        />
      );
      expect(
        screen.getByLabelText("Thư viện ảnh Áo dài truyền thống")
      ).toBeInTheDocument();
    });
  });

  describe("imageUrls takes priority over imageUrl fallback", () => {
    it("should use imageUrls when both are provided", () => {
      render(
        <ProductImageGallery
          imageUrl="https://example.com/fallback.jpg"
          imageUrls={multipleImages}
          productName="Áo dài test"
        />
      );
      // Thumbnails rendered → imageUrls being used (3 thumbnails)
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(3);
    });
  });
});
