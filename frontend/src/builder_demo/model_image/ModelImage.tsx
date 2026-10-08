import { defaultJourneyModel, modelDescription } from '../../model_catalogue/demo'
import type { CatalogueModel } from '../../model_catalogue/model'
import { useState } from 'react'


/** Supply only a locally hosted Model 300 image with documented reuse rights. */
export type ClearedModelPhoto = {
  localSrc: string
  alt: string
  sourcePage: string
  imageLabel: string
  photographerOrRightsHolder: string
  permissionBasis: string
  permissionRecord: string
  checkedAt: string
}

export type ModelImageProps = { photo?: ClearedModelPhoto; model?: CatalogueModel }

function PhotoPreview({ photo }: { photo: ClearedModelPhoto }) {
  const [failed, setFailed] = useState(false)
  return failed
    ? <div className="model-preview-visual model-preview-fallback" role="status">Photo unavailable. View the manufacturer’s gallery using the link below.</div>
    : <img className="model-preview-visual" src={photo.localSrc} alt={photo.alt} loading="lazy" onError={() => setFailed(true)} />
}

/** A source-linked preview until a specifically licensed Model 300 photo is supplied. */
export function ModelImage({ photo, model = defaultJourneyModel }: ModelImageProps) {
  const localPhoto = photo && /^\/(?!\/)/.test(photo.localSrc) &&
    [photo.alt, photo.sourcePage, photo.imageLabel, photo.photographerOrRightsHolder,
      photo.permissionBasis, photo.permissionRecord, photo.checkedAt].every(Boolean) ? photo : undefined

  return <figure className="model-preview">
    <div className="model-preview-layout">
      {localPhoto
        ? <PhotoPreview key={localPhoto.localSrc} photo={localPhoto} />
        : <div className="model-preview-visual model-preview-fallback" role="note">
          <span className="model-preview-mark" aria-hidden="true">{model.provider === 'aux box' ? model.name.replace('Model ', '') : '↗'}</span>
          <span>Manufacturer photo available on {model.provider}</span>
        </div>}
      <figcaption className="model-preview-copy">
        <p className="model-preview-kicker">Manufacturer preview · {model.provider}</p>
        <h3>{model.name}</h3>
        <p>{modelDescription(model)}</p>
        <a className="model-preview-link" href={model.provider_url} target="_blank" rel="noopener noreferrer">View photos and specifications on {model.provider} <span aria-hidden="true">↗</span></a>
        <p className="model-preview-disclaimer">Options and site installation may vary.</p>
      </figcaption>
    </div>
    {localPhoto && <div className="model-preview-credit">
      <span>{localPhoto.imageLabel} · {localPhoto.photographerOrRightsHolder} · <a href={localPhoto.sourcePage} target="_blank" rel="noopener noreferrer">Image source</a></span>
      <span>Reuse: {localPhoto.permissionBasis} · checked {localPhoto.checkedAt} · <a href={localPhoto.permissionRecord} target="_blank" rel="noopener noreferrer">Permission record</a></span>
    </div>}
  </figure>
}
