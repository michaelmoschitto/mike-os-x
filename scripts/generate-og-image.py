#!/usr/bin/env python3
"""
Generate Open Graph image with MTM logo centered on black square background.
"""
from PIL import Image
import os
from pathlib import Path


def generate_og_image():
    # Paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    logo_path = project_root / "assets" / "MTM-no-background.png"
    output_path = project_root / "apps" / "web" / "public" / "LOGO-SQUARE.png"

    # Open Graph standard size
    og_size = (1200, 1200)

    # Create black square background
    og_image = Image.new("RGB", og_size, color="black")

    # Load logo with alpha channel
    logo = Image.open(logo_path).convert("RGBA")

    # Get bounding box of non-transparent pixels
    bbox = logo.getbbox()
    if bbox:
        # Crop to bounding box to remove excess transparent space
        logo_cropped = logo.crop(bbox)
    else:
        logo_cropped = logo

    # Calculate size to fit logo nicely in the square (with padding)
    # Use 80% of the square size to leave some padding
    max_logo_size = int(min(og_size) * 0.8)

    # Get cropped logo dimensions
    logo_width, logo_height = logo_cropped.size

    # Calculate scaling to fit within max_logo_size while maintaining aspect ratio
    scale = min(max_logo_size / logo_width, max_logo_size / logo_height)
    new_logo_size = (int(logo_width * scale), int(logo_height * scale))

    # Resize logo
    logo_resized = logo_cropped.resize(new_logo_size, Image.Resampling.LANCZOS)

    # Calculate position to center the logo (true center)
    x_offset = (og_size[0] - new_logo_size[0]) // 2
    y_offset = (og_size[1] - new_logo_size[1]) // 2

    # Paste logo onto black background
    og_image.paste(logo_resized, (x_offset, y_offset), logo_resized)

    # Save the image
    og_image.save(output_path, "PNG", optimize=True)
    print(f"Open Graph image generated: {output_path}")


if __name__ == "__main__":
    generate_og_image()
