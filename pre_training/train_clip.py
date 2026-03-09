import torch
import clip
import os
from PIL import Image
from torch.utils.data import Dataset, DataLoader

# -----------------------------
# DEVICE
# -----------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
print("Using device:", device)

# -----------------------------
# LOAD CLIP MODEL
# -----------------------------
model, preprocess = clip.load("ViT-B/32", device=device)

# -----------------------------
# DATASET CLASS
# -----------------------------
class LandmarkDataset(Dataset):

    def __init__(self, root):

        self.images = []
        self.labels = []

        # Sort classes for consistency
        self.classes = sorted([
            c for c in os.listdir(root)
            if os.path.isdir(os.path.join(root, c))
        ])

        for c in self.classes:

            path = os.path.join(root, c)

            for img in os.listdir(path):

                if img.lower().endswith((".jpg", ".jpeg", ".png")):

                    self.images.append(os.path.join(path, img))
                    self.labels.append(c)

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):

        image_path = self.images[idx]
        label = self.labels[idx]

        try:
            image = preprocess(Image.open(image_path).convert("RGB"))
        except:
            # handle corrupted image
            image = preprocess(Image.new("RGB", (224, 224)))

        text = clip.tokenize([label])[0]

        return image, text


# -----------------------------
# LOAD DATASET
# -----------------------------
dataset = LandmarkDataset("dataset")

loader = DataLoader(
    dataset,
    batch_size=16,
    shuffle=True,
    num_workers=0
)

print("Total images:", len(dataset))
print("Classes:", dataset.classes)

# -----------------------------
# OPTIMIZER
# -----------------------------
optimizer = torch.optim.Adam(model.parameters(), lr=1e-5)

# -----------------------------
# TRAIN LOOP
# -----------------------------
epochs = 10

for epoch in range(epochs):

    total_loss = 0

    for images, texts in loader:

        images = images.to(device)
        texts = texts.to(device)

        optimizer.zero_grad()

        logits_per_image, logits_per_text = model(images, texts)

        ground_truth = torch.arange(len(images), dtype=torch.long).to(device)

        loss = (
            torch.nn.functional.cross_entropy(logits_per_image, ground_truth)
            + torch.nn.functional.cross_entropy(logits_per_text, ground_truth)
        ) / 2

        loss.backward()
        optimizer.step()

        total_loss += loss.item()

    avg_loss = total_loss / len(loader)

    print(f"Epoch {epoch+1}/{epochs}  Loss: {avg_loss:.4f}")

# -----------------------------
# SAVE MODEL
# -----------------------------
os.makedirs("models", exist_ok=True)

torch.save(model.state_dict(), "models/lookup_clip_model.pt")

print("Training finished. Model saved to models/lookup_clip_model.pt")