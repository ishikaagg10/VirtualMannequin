//TODO: Generate cylinder geometry for highlighting bones
//General class for handling GLSL attributes
export class Attribute {
    constructor(attr) {
        this.values = attr.values;
        this.count = attr.count;
        this.itemSize = attr.itemSize;
    }
}
//Class for handling mesh vertices and skin weights
export class MeshGeometry {
    constructor(mesh) {
        this.uv = null;
        this.position = new Attribute(mesh.position);
        this.normal = new Attribute(mesh.normal);
        if (mesh.uv) {
            this.uv = new Attribute(mesh.uv);
        }
        this.skinIndex = new Attribute(mesh.skinIndex);
        this.skinWeight = new Attribute(mesh.skinWeight);
        this.v0 = new Attribute(mesh.v0);
        this.v1 = new Attribute(mesh.v1);
        this.v2 = new Attribute(mesh.v2);
        this.v3 = new Attribute(mesh.v3);
    }
}
//Class for handling bones in the skeleton rig
export class Bone {
    constructor(bone) {
        this.parent = bone.parent;
        this.children = Array.from(bone.children);
        this.position = bone.position.copy();
        this.endpoint = bone.endpoint.copy();
        this.rotation = bone.rotation.copy();
    }
}
//Class for handling the overall mesh and rig
export class Mesh {
    constructor(mesh) {
        this.geometry = new MeshGeometry(mesh.geometry);
        this.worldMatrix = mesh.worldMatrix.copy();
        this.rotation = mesh.rotation.copy();
        this.bones = [];
        mesh.bones.forEach(bone => {
            this.bones.push(new Bone(bone));
        });
        this.materialName = mesh.materialName;
        this.imgSrc = null;
        this.boneIndices = Array.from(mesh.boneIndices);
        this.bonePositions = new Float32Array(mesh.bonePositions);
        this.boneIndexAttribute = new Float32Array(mesh.boneIndexAttribute);
    }
    //TODO: Create functionality for bone manipulation/key-framing
    getBoneIndices() {
        return new Uint32Array(this.boneIndices);
    }
    getBonePositions() {
        return this.bonePositions;
    }
    getBoneIndexAttribute() {
        return this.boneIndexAttribute;
    }
    getBoneTranslations() {
        let trans = new Float32Array(3 * this.bones.length);
        this.bones.forEach((bone, index) => {
            let res = bone.position.xyz;
            for (let i = 0; i < res.length; i++) {
                trans[3 * index + i] = res[i];
            }
        });
        return trans;
    }
    getBoneRotations() {
        let trans = new Float32Array(4 * this.bones.length);
        this.bones.forEach((bone, index) => {
            let res = bone.rotation.xyzw;
            for (let i = 0; i < res.length; i++) {
                trans[4 * index + i] = res[i];
            }
        });
        return trans;
    }
}
//# sourceMappingURL=Scene.js.map