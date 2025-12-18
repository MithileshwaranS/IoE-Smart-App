import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
import timm

# Device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Image preprocessing
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

# Dataset paths
train_dataset = datasets.ImageFolder("/home/p_sivraj/smart agri/rice_2_split/train/", transform=transform)
val_dataset   = datasets.ImageFolder("/home/p_sivraj/smart agri/rice_2_split/val/", transform=transform)
test_dataset  = datasets.ImageFolder("/home/p_sivraj/smart agri/rice_2_split/test/", transform=transform)

# Data loaders
train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
val_loader   = DataLoader(val_dataset, batch_size=32)
test_loader  = DataLoader(test_dataset, batch_size=32)

# Model
num_classes = len(train_dataset.classes)
model = timm.create_model('mobilevit_xxs', pretrained=True, num_classes=num_classes)
model = model.to(device)

# Loss and optimizer
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=1e-4)

# Training loop
epochs = 5  # adjust as needed

for epoch in range(epochs):
    model.train()
    total_loss = 0
    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    print(f"Epoch {epoch+1}/{epochs}, Loss: {total_loss/len(train_loader)}")

# Save model
torch.save(model.state_dict(), "mobilevit_rice.pth")

