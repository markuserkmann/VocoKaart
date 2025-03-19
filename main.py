import math
import os
from PIL import Image

def generate_tiles(image_path, output_folder="tiles", tile_size=256):
    base_img = Image.open(image_path)
    width, height = base_img.size
    
    max_dim = max(width, height)
    max_zoom = int(math.ceil(math.log2(max_dim / tile_size)))

    max_grid_size = 2 ** max_zoom
    square_size = max_grid_size * tile_size
    
    base_square = Image.new('RGBA', (square_size, square_size), (0, 0, 0, 0))
    
    paste_x = (square_size - width) // 2
    paste_y = (square_size - height) // 2
    base_square.paste(base_img, (paste_x, paste_y))
    
    for zoom in range(max_zoom + 1):
        grid_size = 2 ** zoom 
        level_size = grid_size * tile_size
        
        level_img = base_square.resize((level_size, level_size), Image.Resampling.LANCZOS)
        
        level_folder = os.path.join(output_folder, str(zoom))
        os.makedirs(level_folder, exist_ok=True)
        
        for y in range(grid_size):
            for x in range(grid_size):
                left = x * tile_size
                top = y * tile_size
                right = left + tile_size
                bottom = top + tile_size
                
                tile = level_img.crop((left, top, right, bottom))
                tile_name = f"{y}_{x}.png"
                tile_path = os.path.join(level_folder, tile_name)
                tile.save(tile_path)
        
        print(f"Zoom level {zoom}: {grid_size}x{grid_size} grid ({grid_size*grid_size} tiles)")

generate_tiles("test.png")