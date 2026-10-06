# Model 300 manufacturer preview

`BuilderDemo` already mounts `<ModelImage />` in its model details disclosure, and `App.tsx` already imports `model-image.css`. The default is a link-only manufacturer card while photo reuse rights remain unresolved. See [the handoff](../../../../docs/model-300-preview-card-handoff.md) for the source review and remaining work.

Only pass `photo` after obtaining and recording a grant for an identified Model 300 image. Host the image under `frontend/public/model-300/` and provide a root-relative `localSrc`, meaningful `alt`, original `sourcePage`, `imageLabel`, photographer or rights holder, `permissionBasis`, an accessible `permissionRecord`, and `checkedAt`. The component rejects remote image URLs and falls back to text if a local image fails to load. Do not infer configuration from a gallery filename.
