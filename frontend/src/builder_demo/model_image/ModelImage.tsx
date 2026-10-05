const MODEL_PAGE = 'https://www.auxbox.ca/model-300'

/** A local asset may be supplied only after its reuse terms and model identity are recorded. */
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

export type ModelImageProps = { photo?: ClearedModelPhoto }

/** Source imagery is deliberately absent until a Model 300 photo has a documented grant. */
export function ModelImage({ photo }: ModelImageProps) {
  const localPhoto = photo && /^\/(?!\/)/.test(photo.localSrc) ? photo : undefined

  return <figure className="model-image">
    {localPhoto ? <img src={localPhoto.localSrc} alt={localPhoto.alt} loading="lazy" />
      : <div className="model-image-placeholder" role="note">
        <strong>Model 300 photo unavailable</strong>
        <span>View the manufacturer’s photos on its product page.</span>
      </div>}
    <figcaption>
      <span>{localPhoto ? `${localPhoto.imageLabel} · ${localPhoto.photographerOrRightsHolder}` : 'Manufacturer source · aux box Model 300'} · <a href={localPhoto?.sourcePage ?? MODEL_PAGE} target="_blank" rel="noopener noreferrer">Original Model 300 page</a></span>
      {localPhoto && <span>Image reuse: {localPhoto.permissionBasis} · checked {localPhoto.checkedAt}. <a href={localPhoto.permissionRecord} target="_blank" rel="noopener noreferrer">Permission record</a>.</span>}
      <span>Options, foundation and landscaping may vary. This independent ShovelReady demonstration is not affiliated with aux box. Imagery does not establish dimensions or site fit.</span>
    </figcaption>
  </figure>
}
