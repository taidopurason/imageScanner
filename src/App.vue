<template>
    <div id="app">
        <div>

            <input type="file" id="imageLoader" @change="updateCanvasImage"/>
            <input type="checkbox" id="transform_checkbox" v-model="transform">
            <label for="transform_checkbox">Transform</label>
            <input type="checkbox" id="binarize_checkbox" v-model="binarize">
            <label for="binarize_checkbox">Binarize</label>
            <button @click="rotate">ROTATE</button>
        </div>
        <h2 v-show="!loaded">LOADING...</h2>
        <canvas v-show="loaded" ref="background" id="background"></canvas>


    </div>
</template>

<script>
    import ImageTool from "./imageTools/imageTool.js"

    export default {
        name: 'App',
        data: () => {
            return {
                loaded: false,
                height: 1080,
                width: 1920,
                zoom: 1.0,
                sample: require('./test3.jpg'),
                transform: true,
                binarize: true,
                src: require('./test3.jpg'),
            }
        },
        methods: {
            updateCanvasImage(e) {
                window.console.log("uploading");
                let files = e.target.files;
                let reader = new FileReader();

                reader.onload = () => {
                    window.console.log("loaded");
                    this.src = event.target.result;
                    window.console.log(this.src);
                    this.loadCanvas()
                };

                reader.readAsDataURL(files[0]);

            },
            loadCanvas: function () {
                this.loaded = false;

                let img = new Image();

                img.onload = () => {
                    window.console.log("image loaded");
                    let cvs = this.$refs.background;
                    let ctx = cvs.getContext('2d');

                    this.zoom = Math.min(this.width / img.naturalWidth, this.height / img.naturalHeight);

                    cvs.width = img.naturalWidth * this.zoom;
                    cvs.height = img.naturalHeight * this.zoom;
                    ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
                    ImageTool.processImage(this.transform, this.binarize, this.isLoaded, this.alertOnFail)
                };
                img.src = this.src;
            },
            rotate: function () {
                ImageTool.rotate()
            },
            isLoaded: function () {
                this.loaded = true
            },
            alertOnFail: function () {
                alert("Could not find 4 corners!");
                this.transform = false
            }

        },
        mounted() {
            this.loadCanvas("./test3.jpg");
        },
        watch: {
            transform: function () {
                this.loadCanvas();
            },
            binarize: function () {
                this.loadCanvas();
            }
        }
    }
</script>

<style>
    #app {
        font-family: Avenir, Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: center;
        color: #2c3e50;
        margin-top: 60px;
    }
</style>
