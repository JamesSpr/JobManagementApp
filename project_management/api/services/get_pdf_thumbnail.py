import graphene
import base64
import tempfile
import uuid
import os
import fitz
from PIL import Image
from io import BytesIO
import numpy as np
from graphql_jwt.decorators import login_required

INSURANCES_PATH = r"C:\Users\Aurify Constructions\Aurify\Aurify - Maintenance\Admin\Insurances"

class PDFToImage(graphene.Mutation):
    class Arguments:
        file = graphene.String()
        filename = graphene.String()

    success = graphene.Boolean()
    thumbnail_path = graphene.String()
    file_path = graphene.String()

    @classmethod
    @login_required
    def mutate(self, root, info, file, filename):
        if not file: 
            return self(success=False)

        file = file.replace("data:application/pdf;base64,", "")
        pdf = base64.b64decode(file, validate=True)

        file_path = os.path.join(INSURANCES_PATH, filename)
        # Save pdf to remittance advice folder
        f = open(file_path, 'wb')
        f.write(pdf)
        f.close()

        # write pdf to temp file so we can convert to a thumbnail image
        tf_pdf = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
        tf_pdf.write(pdf)
        tf_pdf.close()

        img_filename = uuid.uuid4().hex
        while os.path.exists(f"Media\insurances\{img_filename}.jpg"):
            img_filename = uuid.uuid4().hex

        thumbnail_image_path = f"Media\insurances\{img_filename}.jpg"

        with fitz.open(tf_pdf.name) as doc: # open document
            img_bytes = []
            for page in doc:
                pix = page.get_pixmap()  # render page to an image
                img_bytes.append(pix.pil_tobytes(format="JPEG", optimize=True))

            imgs = [Image.open(BytesIO(i)) for i in img_bytes]

            # pick the image which is the smallest, and resize the others to match it (can be arbitrary image shape here)
            min_shape = sorted([(np.sum(i.size), i.size ) for i in imgs])[0][1]

            imgs_comb = np.vstack([i.resize(min_shape) for i in imgs])
            imgs_comb = Image.fromarray( imgs_comb)
            imgs_comb.save(thumbnail_image_path)

        os.remove(tf_pdf.name) # remove temp file

        return self(success=True, thumbnail_path=thumbnail_image_path, file_path=file_path)