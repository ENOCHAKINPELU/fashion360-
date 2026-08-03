# Fashion360 Image Asset Checklist

None of these exist yet — every image slot they belong to currently renders
an editorial placeholder via `src/shared/components/fashion-image.tsx`.
Drop a real file into the folder below and pass its path as `src` to the
relevant `<FashionImage>` call; no layout or component change is needed.

Avoid: generic corporate stock photos, obviously AI-generated fashion
imagery, low-resolution images, watermarks, inconsistent lighting between
images used in the same section.

| # | Image | Folder | Used in | Requirement | Aspect |
|---|-------|--------|---------|-------------|--------|
| 1 | Hero campaign | `hero/` | Landing hero | Full-body model in premium custom fashion, authentic/diverse/contemporary, negative space for text | 16:9 desktop, 4:5 mobile crop |
| 2 | Designer portraits | `designers/` | Discovery section, designer cards | 3–6 designer portraits or studio shots | 4:5 |
| 3 | Designer at work | `portfolio/` | "How it works" / journey section | Designer actively sketching or creating a garment | 4:5 |
| 4 | Customer consultation | `consultation/` | Consultation section | Designer consulting with a customer | 16:9 |
| 5 | Measurement | `measurement/` | Measurement experience | Fashion professional taking a customer's measurements — must NOT imply automated/AI measurement (V1 is manual) | 4:5 |
| 6 | Design preview | `design-preview/` | 3D design preview section | Premium digital fashion design visualization | 16:9 |
| 7 | Garment detail | `portfolio/` | Designer portfolio | Close-up of fabric, stitching, texture, craftsmanship | 1:1 |
| 8 | Delivery | `delivery/` | Delivery tracking section | Fashion package being prepared/delivered | 16:9 |
| 9 | Customer wearing final outfit | `lifestyle/` | Final CTA | Customer wearing their completed custom outfit | 4:5 or 16:9 |
| 10 | Digital wardrobe | `wardrobe/` | Wardrobe section / customer dashboard | Multiple premium completed-outfit images | 1:1 |
| 11 | Designer profile cover | `designers/` | Designer profile page | Wide editorial fashion image | 16:9 |
| 12 | Designer portfolio set | `portfolio/` | Designer profile | 6–12 portfolio images | 4:5 and 1:1 |
| 13 | Empty states | `empty-states/` | No orders / no designers / no messages / no wardrobe items / no notifications / no saved designers | Elegant illustrated or minimal — no generic emoji | varies |

Prefer real designer-uploaded content (portfolios, completed outfits,
customer fashion history) over stock photography wherever the platform
already has a real upload path for it. Designer profile images must be
authentic — no AI-generated people as primary marketplace profile images.
