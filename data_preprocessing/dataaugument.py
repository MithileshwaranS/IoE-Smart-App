import os
import numpy as np
from PIL import Image
import random
import shutil

# --- Configuration ---
# ⚠️ IMPORTANT: Change this to your root directory containing the subfolders (classes)
ROOT_DIR = 'data_preprocessing/data' 
# ⚠️ IMPORTANT: Change this to where you want the balanced dataset to be saved
OUTPUT_DIR = 'data_preprocessing/data_balanced' 
# ---------------------

def get_all_image_paths(folder_path, image_extensions=('.jpg', '.jpeg', '.png', '.bmp', '.tiff')):
    """
    Recursively finds all image paths in a given folder.
    
    Args:
        folder_path (str): The starting path.
        image_extensions (tuple): Extensions to look for.
        
    Returns:
        list: A list of full paths to all images.
    """
    image_paths = []
    for root, _, files in os.walk(folder_path):
        for filename in files:
            if filename.lower().endswith(image_extensions):
                image_paths.append(os.path.join(root, filename))
    return image_paths

def calculate_median_images_recursive(root_dir):
    """
    Recursively finds all subfolders containing images, counts them, 
    and calculates the median count.
    
    Args:
        root_dir (str): The path to the root directory.
        
    Returns:
        tuple: A tuple containing (dict of folder counts, median count, dict of folder paths).
    """
    folder_counts = {}
    # Stores the actual path for each class name (e.g., 'classA': '/path/to/classA')
    folder_paths = {} 
    
    image_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff')
    print(f"🔬 Analyzing image counts recursively in: {root_dir}")
    
    # os.walk traverses the directory tree
    for root, dirs, files in os.walk(root_dir, topdown=False):
        # A 'leaf' directory is one that does not contain any subdirectories (dirs list is empty)
        # or it's simply a directory containing images we want to count.
        
        image_files = [f for f in files if f.lower().endswith(image_extensions)]
        
        if image_files:
            # Use the directory name as the class name
            folder_name = os.path.basename(root)
            # Ensure unique names if the same name appears at different levels
            # We will use the full path as the unique key, and the basename as the display name
            unique_key = root 
            
            # Count only if it hasn't been counted as a parent of a deeper leaf node
            if unique_key not in folder_counts:
                folder_counts[unique_key] = len(image_files)
                folder_paths[unique_key] = root
                print(f"   - Class '{folder_name}' (Path: {root}): {len(image_files)} images")

    # Extract the counts and calculate the median
    counts_list = list(folder_counts.values())
    if not counts_list:
        print("❌ No subfolders with images found. Exiting.")
        return {}, 0, {}

    # Calculate the median using numpy
    median_count = int(np.median(counts_list))
    print(f"\n📊 Calculated Median Image Count: {median_count}")
    
    return folder_counts, median_count, folder_paths

def augment_image(img, augmentations):
    """Applies a random augmentation to a PIL Image."""
    # Pick a random augmentation from the available list
    aug_func = random.choice(augmentations)
    return aug_func(img)

def augment_flip_h(img):
    """Horizontal Flip."""
    return img.transpose(Image.FLIP_LEFT_RIGHT)

def augment_flip_v(img):
    """Vertical Flip."""
    return img.transpose(Image.FLIP_TOP_BOTTOM)

def augment_rotate_90(img):
    """Rotate 90 degrees."""
    return img.transpose(Image.ROTATE_90)
    
def augment_rotate_m90(img):
    """Rotate -90 degrees (270)."""
    return img.transpose(Image.ROTATE_270)

def balance_dataset(folder_paths, output_dir, folder_counts, target_count):
    """
    Balances the dataset to the target count (median) using augmentation/deletion.
    
    Args:
        folder_paths (dict): Dictionary of full paths for each class (key is the path).
        output_dir (str): Path to the new, balanced dataset directory.
        folder_counts (dict): Dictionary of image counts per class path.
        target_count (int): The target number of images per folder (median).
    """
    
    # Ensure the output directory is clean
    if os.path.exists(output_dir):
        print(f"\n🧹 Cleaning up existing output directory: {output_dir}")
        shutil.rmtree(output_dir)
    os.makedirs(output_dir)
    print(f"✅ Created new output directory: {output_dir}")
    
    # List of available augmentation functions
    augmentations = [augment_flip_h, augment_flip_v, augment_rotate_90, augment_rotate_m90]
    image_extensions = ('.jpg', '.jpeg', '.png') # Augmentation/copy works best with these

    # Iterate through the unique keys which are the full paths of the class directories
    for unique_key, original_folder_path in folder_paths.items():
        current_count = folder_counts[unique_key]
        folder_name = os.path.basename(original_folder_path) # The class label
        
        # Create a new, flat structure for the balanced data
        new_folder_path = os.path.join(output_dir, folder_name)
        os.makedirs(new_folder_path, exist_ok=True)
        
        print(f"\n⚙️ Processing Class '{folder_name}' (Current: {current_count}, Target: {target_count})")
        
        # Get a list of all images in the original folder (non-recursive in the leaf node)
        original_images_paths = [
            os.path.join(original_folder_path, f)
            for f in os.listdir(original_folder_path) 
            if os.path.isfile(os.path.join(original_folder_path, f)) and f.lower().endswith(image_extensions)
        ]
        
        if not original_images_paths:
            print(f"   - ⚠️ Skipping: No images found in {folder_name} at path {original_folder_path}.")
            continue

        # --- Phase 1: Copying and Deletion (if current_count >= target_count) ---
        if current_count >= target_count:
            # Randomly select 'target_count' image paths to keep and copy
            images_to_keep_paths = random.sample(original_images_paths, target_count)
            
            for i, src in enumerate(images_to_keep_paths):
                # Use os.path.basename to get just the filename
                original_filename = os.path.basename(src) 
                # Create a new, consistent filename
                dst_filename = f"{folder_name}_{i:04d}{os.path.splitext(original_filename)[1]}"
                dst = os.path.join(new_folder_path, dst_filename)
                shutil.copy2(src, dst)
            
            print(f"   - DELETION MODE: Copied {target_count} images to balance the count.")
            
        # --- Phase 2: Copying and Augmentation (if current_count < target_count) ---
        else: # current_count < target_count
            
            # 1. Copy all original images first
            for i, src in enumerate(original_images_paths):
                original_filename = os.path.basename(src)
                dst_filename = f"{folder_name}_{i:04d}{os.path.splitext(original_filename)[1]}"
                dst = os.path.join(new_folder_path, dst_filename)
                shutil.copy2(src, dst)

            images_copied = current_count
            images_needed = target_count - current_count
            
            print(f"   - AUGMENTATION MODE: Need {images_needed} more images.")

            # 2. Augment images until the target count is reached
            for i in range(images_needed):
                # Choose a random image path to augment
                src_path = random.choice(original_images_paths)
                
                try:
                    # Open the image from the source path
                    img = Image.open(src_path).convert('RGB')
                    augmented_img = augment_image(img, augmentations)
                    
                    # New filename format: [Folder]_[Index]_[Aug]_[Extension]
                    new_filename = f"{folder_name}_{images_copied + i:04d}_aug{i:02d}.jpg"
                    new_path = os.path.join(new_folder_path, new_filename)
                    augmented_img.save(new_path, 'jpeg')
                    
                except Exception as e:
                    print(f"   - Error augmenting {os.path.basename(src_path)}: {e}")
                    continue

            print(f"   - Added {images_needed} augmented images.")
            
    print("\n\n🎉 Dataset Balancing Complete! New dataset is in the folder: " + OUTPUT_DIR)


# --- Main Execution Block ---
if __name__ == '__main__':
    # 1. Calculate the median using the recursive function
    counts, median, paths = calculate_median_images_recursive(ROOT_DIR)
    
    if median > 0:
        # 2. Balance the dataset
        # Pass the map of class paths
        balance_dataset(paths, OUTPUT_DIR, counts, median)