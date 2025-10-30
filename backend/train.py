# src/train.py
import os, argparse, time
import torch, torch.nn as nn, torch.optim as optim
from tqdm import tqdm
from dataset import get_dataloaders
from model import build_model, DEVICE

def save_checkpoint(model, path):
    torch.save(model.state_dict(), path)

def train(epochs=20, lr=1e-4, batch_size=16, img_size=224, outdir="outputs",
          backbone="mobilenetv3_large_100", resume_checkpoint=None):
    os.makedirs(outdir, exist_ok=True)
    device = DEVICE
    print("Using device:", device)

    train_loader, val_loader, test_loader, classes = get_dataloaders(img_size=img_size, batch_size=batch_size)
    model = build_model(name=backbone, num_classes=len(classes), pretrained=True).to(device)

    if resume_checkpoint and os.path.exists(resume_checkpoint):
        print("Resuming from", resume_checkpoint)
        model.load_state_dict(torch.load(resume_checkpoint, map_location=device))

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='max', patience=3, factor=0.5)

    best_acc = 0.0
    for epoch in range(1, epochs+1):
        model.train()
        running = 0.0
        pbar = tqdm(train_loader, desc=f"Epoch {epoch}/{epochs}")
        for imgs, labels in pbar:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running += loss.item()
            pbar.set_postfix(loss = running / (pbar.n+1))
        train_loss = running / max(1, len(train_loader))

        # validation
        model.eval()
        correct = 0
        total = 0
        val_loss = 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                val_loss += loss.item()
                preds = outputs.argmax(1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)
        val_acc = 100.0 * correct / total
        val_loss = val_loss / max(1, len(val_loader))
        print(f"Epoch {epoch}: train_loss={train_loss:.4f}, val_loss={val_loss:.4f}, val_acc={val_acc:.2f}%")

        scheduler.step(val_acc)
        if val_acc > best_acc:
            best_acc = val_acc
            save_checkpoint(model, os.path.join(outdir, "best.pth"))
            print("Saved best model.")

    save_checkpoint(model, os.path.join(outdir, "final.pth"))
    print("Training finished. Best val_acc: %.2f%%" % best_acc)

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--epochs", type=int, default=20)
    p.add_argument("--batch-size", type=int, default=16)
    p.add_argument("--img-size", type=int, default=224)
    p.add_argument("--lr", type=float, default=1e-4)
    p.add_argument("--outdir", type=str, default="outputs")
    p.add_argument("--backbone", type=str, default="mobilenetv3_large_100")
    p.add_argument("--resume", type=str, default=None)
    args = p.parse_args()
    train(epochs=args.epochs, lr=args.lr, batch_size=args.batch_size, img_size=args.img_size,
          outdir=args.outdir, backbone=args.backbone, resume_checkpoint=args.resume)
