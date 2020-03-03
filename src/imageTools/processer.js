const cv = require('./opencv.js');

class Processer {
    loadOpenCV() {
        if (cv.onRuntimeInitialized && cv && cv.Mat && cv.imread) {
            return Promise.resolve()
        }
        return new Promise(resolve => {
            cv.onRuntimeInitialized = () => {
                resolve()
            }
        })
    }

    orderPoints(points) {
        let sorted = points.sort((a, b) => a[0] - b[0]);
        let first_fourth = sorted.slice(0, 2).sort((a, b) => a[1] - b[1]);
        let second_third = sorted.slice(2, 4).sort((a, b) => a[1] - b[1]);
        //portrait
        //return {tr: first_fourth[0], br: second_third[0], bl: second_third[1], tl: first_fourth[1]}
        //landscape
        return {tl: first_fourth[0], tr: second_third[0], br: second_third[1], bl: first_fourth[1]}
    }

    resize(img, height) {
        let ratio = height / img.matSize[0];
        cv.resize(img, img, new cv.Size(0, 0), ratio, ratio)
    }

    findContours(edges) {
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

        let sortableContours = [];
        for (let i = 0; i < contours.size(); ++i) {
            let cnt = contours.get(i);
            let area = cv.contourArea(cnt, false);
            let perim = cv.arcLength(cnt, false);
            sortableContours.push({areaSize: area, perimiterSize: perim, contour: cnt})
        }
        sortableContours.sort((item1, item2) => {
            return (item1.areaSize > item2.areaSize) ? -1 : (item1.areaSize < item2.areaSize) ? 1 : 0;
        });

        let foundContour;
        for (let contour of sortableContours) {
            let approx = new cv.Mat();
            cv.approxPolyDP(contour.contour, approx, .05 * sortableContours[0].perimiterSize, true);
            if (approx.rows === 4 && contour.areaSize > 100000) {
                foundContour = approx;
                break;
            }
        }

        if (foundContour == null) {
            window.console.log("contours not found");
            return;
        }

        return this.orderPoints([
            [foundContour.data32S[0], foundContour.data32S[1]],
            [foundContour.data32S[2], foundContour.data32S[3]],
            [foundContour.data32S[4], foundContour.data32S[5]],
            [foundContour.data32S[6], foundContour.data32S[7]]]);
    }

    fourPointTransform(src, dst, pts) {
        let distance = (x, y) => Math.floor(Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2));

        let width1 = distance(pts.br, pts.bl);
        let width2 = distance(pts.tr, pts.tl);
        let maxWidth = Math.max(width1, width2);

        let height1 = distance(pts.tr, pts.br);
        let height2 = distance(pts.tl, pts.bl);
        let maxHeight = Math.max(height1, height2);

        let finalDestCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth - 1, 0, maxWidth - 1, maxHeight - 1, 0, maxHeight - 1]);
        let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [pts.tl[0], pts.tl[1], pts.tr[0], pts.tr[1], pts.br[0], pts.br[1], pts.bl[0], pts.bl[1]]);
        let dsize = new cv.Size(maxWidth, maxHeight);
        let M = cv.getPerspectiveTransform(srcCoords, finalDestCoords);
        cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
        M.delete();

    }

    transformImage(src, dst) {
        let cnt = new cv.Mat();
        let height = 500;
        let ratio = src.matSize[0] / height;

        let scale_point = (pt) => [Math.floor(pt[0] * ratio), Math.floor(pt[1] * ratio)];
        let scale = (pts) => ({
            tl: scale_point(pts.tl),
            bl: scale_point(pts.bl),
            br: scale_point(pts.br),
            tr: scale_point(pts.tr)
        });

        cv.cvtColor(src, cnt, cv.COLOR_RGB2GRAY, 0);
        this.resize(cnt, height);
        cv.GaussianBlur(cnt, cnt, new cv.Size(5, 5), 0);
        cv.Canny(cnt, cnt, 75, 200);

        let pts = this.findContours(cnt);

        if (pts == null) {
            return true;
        }

        pts = scale(pts);

        this.fourPointTransform(src, dst, pts);
        cv.resize(dst, dst, new cv.Size(src.cols, src.rows));

        cnt.delete();
    }

    binarizeImage(src, dst) {
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
        cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 117, 20);
        cv.GaussianBlur(dst, dst, new cv.Size(1, 1), 30)

    }

    rotateImage(src, dst, degrees) {
        let dsize = new cv.Size(src.cols, src.rows);
        let center = new cv.Point(src.cols / 2, src.rows / 2);
        let M = cv.getRotationMatrix2D(center, degrees, 1);
        cv.warpAffine(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
        M.delete()
    }


    transformCanvas(canvas) {
        return new Promise(resolve => {
            window.console.log("transforming canvas...");
            let src = cv.imread(canvas);
            let dst = new cv.Mat();


            if(this.transformImage(src, dst))
                resolve(false);

            cv.imshow(canvas, dst);
            src.delete();
            dst.delete();
            resolve(true)
        })
    }

    binarizeCanvas(canvas) {
        return new Promise(resolve => {
            window.console.log("binarizing canvas...");
            let src = cv.imread(canvas);

            this.binarizeImage(src, src);

            cv.imshow(canvas, src);
            src.delete();
            resolve()
        })
    }

    rotateCanvas180(canvas) {
        return new Promise(resolve => {
            let src = cv.imread(canvas);

            this.rotateImage(src, src, 180);
            cv.imshow(canvas, src);
            src.delete();
            resolve()
        })
    }


}

export default new Processer();