Names: Ishika Aggarwal and Venkata Phani (Sri) Kesiraju

In this project, we implemented several different extra credit tasks:

Root Joint Translation: We implemented the ability to translate root joints using the mouse. When hovering over a root bone (parent = -1), right-click and drag to move it in the camera's view plane. The translation is stored on the Bone class and propagated to all children during updateSkeleton(). Left-click drag still rotates as normal.
 
Texture Mapping: We implemented texture mapping for meshes that have an associated texture in their Collada file. The fragment shader checks a hasTexture uniform and samples the diffuse texture using UV coordinates with ambient + diffuse lighting. When no texture is present it falls back to normal-based coloring. Press 4 (mapped_cube) to see the textured cube. Texture mapping is applied automatically for any scene that includes texture data.
 
Shadow Mapping: We implemented real-time shadow mapping using a two-pass technique. The first pass renders the scene from the light's perspective into an offscreen RGBA depth texture. The second pass samples this shadow map in both the floor and scene fragment shaders to darken occluded fragments. We use RGBA depth encoding for WebGL 1 compatibility, reverse culling to reduce shadow acne, and a small depth bias. Shadows update every frame and are visible on all scenes automatically.

Custom Character Model: We downloaded a custom rigged character (Mixamo) and integrated it into the project. The model is scaled down from centimeter to meter units via the mWorld matrix. Press 8 to load the character. It can be posed using the same bone rotation and selection controls as the built-in models. The custom poses are listed as pose1, pose2, and pose3. 
