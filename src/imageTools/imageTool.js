import Processer from "./processer"

class ImageTool {
    rotations = 0;

    processImage (transform = true, binarize = true, onLoad, onFailToTransform) {
        Processer.loadOpenCV().then(async () => {
            if (typeof onLoad === "function") {
                onLoad()
            }

            if (transform) {
                const transformed = await Processer.transformCanvas("background");
                if (!transformed) {
                    if (typeof onLoad === "function") {
                        onFailToTransform()
                    }
                }
            }
            if (binarize) {
                await Processer.binarizeCanvas("background")
            }
            if (this.rotations % 2 !== 0){
                await Processer.rotateCanvas180("background")
            }
        });
    }
    rotate () {
        this.rotations += 1;
        Processer.loadOpenCV().then(Processer.rotateCanvas180("background"))
    }
}

export default new ImageTool();