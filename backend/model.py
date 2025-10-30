import timm
import torch.nn as nn

def get_device():
    import torch
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")

DEVICE = get_device()

def build_model(name="mobilenetv3_large_100", num_classes=41, pretrained=True, bottleneck=None):
    model = timm.create_model(name, pretrained=pretrained, num_classes=0)
    feat_dim = model.num_features 

    if bottleneck is None:
        bottleneck = max(128, min(512, num_classes * 8))

    classifier = nn.Sequential(
        nn.Linear(feat_dim, bottleneck),
        nn.BatchNorm1d(bottleneck),
        nn.ReLU(inplace=True),
        nn.Dropout(0.4),
        nn.Linear(bottleneck, num_classes)
    )

    class ModelWrapper(nn.Module):
        def __init__(self, backbone, head):
            super().__init__()
            self.backbone = backbone
            self.head = head
        def forward(self, x):
            feats = self.backbone.forward_features(x)
            feats = feats.mean([2,3]) 
            out = self.head(feats)
            return out
    return ModelWrapper(model, classifier)