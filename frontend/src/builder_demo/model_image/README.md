# Model 300 image mount

Mount `<ModelImage />` adjacent to the Model 300 specifications in `BuilderDemo`. It displays a source-linked text fallback. Import `ModelImage` from `./model_image/ModelImage` and import `./builder_demo/model_image/model-image.css` in `App.tsx` alongside the existing component styles. No catalogue or model specification field is involved.

Only pass `photo` after obtaining and recording permission for a specifically identified Model 300 image. Host the permitted file locally and provide a root-relative `localSrc`, meaningful `alt`, original `sourcePage`, `imageLabel`, photographer or rights holder, `permissionBasis`, a public or project-accessible `permissionRecord`, and `checkedAt` date. Do not use a remote image URL. Preserve the original aspect ratio and choose alt text for the actual image; do not infer a building configuration from a gallery filename.

The default fallback remains appropriate while [rights research](../../../../../docs/research/model-300-image/README.md) is unresolved. Product dimensions and image rights are separate evidence.
