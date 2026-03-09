import torch
import clip
import os
from PIL import Image

device = "cuda" if torch.cuda.is_available() else "cpu"

# -----------------------------
# LOAD MODEL
# -----------------------------
model, preprocess = clip.load("ViT-B/32", device=device)

model.load_state_dict(
    torch.load("models/lookup_clip_model.pt", map_location=device)
)

model.eval()

# -----------------------------
# DATASET PATH
# -----------------------------
dataset_path = "dataset"

classes = sorted([
    c for c in os.listdir(dataset_path)
    if os.path.isdir(os.path.join(dataset_path, c))
])

print("Classes:", classes)

# -----------------------------
# TEXT FEATURES
# -----------------------------
text_tokens = clip.tokenize(classes).to(device)

with torch.no_grad():
    text_features = model.encode_text(text_tokens)

correct = 0
total = 0

# -----------------------------
# EVALUATE
# -----------------------------
with torch.no_grad():

    for label in classes:

        folder = os.path.join(dataset_path, label)

        for img_name in os.listdir(folder):

            if not img_name.lower().endswith((".jpg",".jpeg",".png")):
                continue

            img_path = os.path.join(folder, img_name)

            try:
                image = preprocess(
                    Image.open(img_path).convert("RGB")
                ).unsqueeze(0).to(device)

            except:
                continue

            image_features = model.encode_image(image)

            similarity = image_features @ text_features.T

            pred_index = similarity.argmax().item()

            predicted = classes[pred_index]

            if predicted == label:
                correct += 1

            total += 1


accuracy = (correct / total) * 100

print("Correct predictions:", correct)
print("Total images:", total)
print("Accuracy:", round(accuracy,2), "%")