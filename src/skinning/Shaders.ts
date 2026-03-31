
export const shadowVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec4 skinIndices;
    attribute vec4 skinWeights;
    attribute vec4 v0;
    attribute vec4 v1;
    attribute vec4 v2;
    attribute vec4 v3;

    uniform mat4 uLightViewProj;
    uniform mat4 mWorld;
    uniform vec3 jTrans[64];
    uniform vec4 jRots[64];

    vec3 qtrans(vec4 q, vec3 v) {
        return v + 2.0 * cross(cross(v, q.xyz) - q.w*v, q.xyz);
    }

    void main () {
        vec3 pos0 = jTrans[int(skinIndices.x)] + qtrans(jRots[int(skinIndices.x)], v0.xyz);
        vec3 pos1 = jTrans[int(skinIndices.y)] + qtrans(jRots[int(skinIndices.y)], v1.xyz);
        vec3 pos2 = jTrans[int(skinIndices.z)] + qtrans(jRots[int(skinIndices.z)], v2.xyz);
        vec3 pos3 = jTrans[int(skinIndices.w)] + qtrans(jRots[int(skinIndices.w)], v3.xyz);

        vec3 trans = (pos0 * skinWeights.x) + 
                     (pos1 * skinWeights.y) + 
                     (pos2 * skinWeights.z) + 
                     (pos3 * skinWeights.w);

        gl_Position = uLightViewProj * mWorld * vec4(trans, 1.0);
    }
`;

export const shadowFSText = `
    precision mediump float;

    vec4 encodeDepth(float v) {
        vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * v;
        enc = fract(enc);
        enc -= enc.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0);
        return enc;
    }

    void main () {
        gl_FragColor = encodeDepth(gl_FragCoord.z);
    }
`;


export const floorVSText = `
    precision mediump float;

    uniform vec4 uLightPos;
    uniform mat4 uWorld;
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform mat4 uLightViewProj;
    
    attribute vec4 aVertPos;

    varying vec4 vClipPos;
    varying vec4 vLightSpacePos;

    void main () {
        gl_Position = uProj * uView * uWorld * aVertPos;
        vClipPos = gl_Position;
        vLightSpacePos = uLightViewProj * uWorld * aVertPos;
    }
`;

export const floorFSText = `
    precision mediump float;

    uniform mat4 uViewInv;
    uniform mat4 uProjInv;
    uniform vec4 uLightPos;
    uniform sampler2D uShadowMap;
    uniform float uShadowEnabled;

    varying vec4 vClipPos;
    varying vec4 vLightSpacePos;

    float decodeDepth(vec4 rgba) {
        return dot(rgba, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0));
    }

    float getShadow(vec4 lightSpacePos) {
        vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;
        projCoords = projCoords * 0.5 + 0.5;
        
        if (projCoords.x < 0.0 || projCoords.x > 1.0 || 
            projCoords.y < 0.0 || projCoords.y > 1.0 ||
            projCoords.z > 1.0) {
            return 1.0;
        }
        
        float closestDepth = decodeDepth(texture2D(uShadowMap, projCoords.xy));
        float currentDepth = projCoords.z;
        float bias = 0.005;
        
        float shadow = currentDepth - bias > closestDepth ? 0.5 : 1.0;
        return shadow;
    }

    void main() {
        vec4 wsPos = uViewInv * uProjInv * vec4(vClipPos.xyz/vClipPos.w, 1.0);
        wsPos /= wsPos.w;
        /* Determine which color square the position is in */
        float checkerWidth = 5.0;
        float i = floor(wsPos.x / checkerWidth);
        float j = floor(wsPos.z / checkerWidth);
        vec3 color = mod(i + j, 2.0) * vec3(1.0, 1.0, 1.0);

        /* Compute light fall off */
        vec4 lightDirection = uLightPos - wsPos;
        float dot_nl = dot(normalize(lightDirection), vec4(0.0, 1.0, 0.0, 0.0));
	    dot_nl = clamp(dot_nl, 0.0, 1.0);

        float shadow = 1.0;
        if (uShadowEnabled > 0.5) {
            shadow = getShadow(vLightSpacePos);
        }
	
        gl_FragColor = vec4(clamp(dot_nl * color * shadow, 0.0, 1.0), 1.0);
    }
`;


export const sceneVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec2 aUV;
    attribute vec3 aNorm;
    attribute vec4 skinIndices;
    attribute vec4 skinWeights;
    
    //vertices used for bone weights (assumes up to four weights per vertex)
    attribute vec4 v0;
    attribute vec4 v1;
    attribute vec4 v2;
    attribute vec4 v3;
    
    varying vec4 lightDir;
    varying vec2 uv;
    varying vec4 normal;
    varying vec4 vLightSpacePos;
 
    uniform vec4 lightPosition;
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;
    uniform mat4 uLightViewProj;

    //Joint translations and rotations to determine weights (assumes up to 64 joints per rig)
    uniform vec3 jTrans[64];
    uniform vec4 jRots[64];

    // Helper function to apply quaternion rotation to a vector
    vec3 qtrans(vec4 q, vec3 v) {
        return v + 2.0 * cross(cross(v, q.xyz) - q.w*v, q.xyz);
    }

    void main () {
        // Calculate the deformed position for each of the up-to-4 influencing bones
        vec3 pos0 = jTrans[int(skinIndices.x)] + qtrans(jRots[int(skinIndices.x)], v0.xyz);
        vec3 pos1 = jTrans[int(skinIndices.y)] + qtrans(jRots[int(skinIndices.y)], v1.xyz);
        vec3 pos2 = jTrans[int(skinIndices.z)] + qtrans(jRots[int(skinIndices.z)], v2.xyz);
        vec3 pos3 = jTrans[int(skinIndices.w)] + qtrans(jRots[int(skinIndices.w)], v3.xyz);

        // Blend the positions together using the skin weights
        vec3 trans = (pos0 * skinWeights.x) + 
                     (pos1 * skinWeights.y) + 
                     (pos2 * skinWeights.z) + 
                     (pos3 * skinWeights.w);

        vec4 worldPosition = mWorld * vec4(trans, 1.0);
        gl_Position = mProj * mView * worldPosition;
        
        //  Compute light direction and transform to camera coordinates
        lightDir = lightPosition - worldPosition;
        
        vec4 aNorm4 = vec4(aNorm, 0.0);
        normal = normalize(mWorld * vec4(aNorm, 0.0));
    
        uv = aUV;
        vLightSpacePos = uLightViewProj * worldPosition;
    }

`;

export const sceneFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec2 uv;
    varying vec4 normal;
    varying vec4 vLightSpacePos;

    uniform sampler2D uTexture;
    uniform float hasTexture;
    uniform sampler2D uShadowMap;
    uniform float uShadowEnabled;

    float decodeDepth(vec4 rgba) {
        return dot(rgba, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0));
    }

    float getShadow(vec4 lightSpacePos) {
        vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;
        projCoords = projCoords * 0.5 + 0.5;
        
        if (projCoords.x < 0.0 || projCoords.x > 1.0 || 
            projCoords.y < 0.0 || projCoords.y > 1.0 ||
            projCoords.z > 1.0) {
            return 1.0;
        }
        
        float closestDepth = decodeDepth(texture2D(uShadowMap, projCoords.xy));
        float currentDepth = projCoords.z;
        float bias = 0.005;
        
        float shadow = currentDepth - bias > closestDepth ? 0.5 : 1.0;
        return shadow;
    }

    void main () {
        vec3 normColor = vec3((normal.x + 1.0)/2.0, (normal.y + 1.0)/2.0, (normal.z + 1.0)/2.0);
        
        float shadow = 1.0;
        if (uShadowEnabled > 0.5) {
            shadow = getShadow(vLightSpacePos);
        }
        
        if (hasTexture > 0.5) {
            vec4 texColor = texture2D(uTexture, uv);
            
            // Simple diffuse lighting with texture
            float dot_nl = max(dot(normalize(lightDir), normal), 0.0);
            dot_nl = clamp(dot_nl * 0.8 + 0.2, 0.0, 1.0); // ambient + diffuse
            gl_FragColor = vec4(texColor.rgb * dot_nl * shadow, texColor.a);
        } else {
            gl_FragColor = vec4(normColor * shadow, 1.0);
        }
    }
`;



export const skeletonVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute float boneIndex;
    
    varying float vBoneIndex;

    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    uniform vec3 bTrans[64];
    uniform vec4 bRots[64];

    vec3 qtrans(vec4 q, vec3 v) {
        return v + 2.0 * cross(cross(v, q.xyz) - q.w*v, q.xyz);
    }

    void main () {
        vBoneIndex = boneIndex;
        int index = int(boneIndex);
        gl_Position = mProj * mView * mWorld * vec4(bTrans[index] + qtrans(bRots[index], vertPosition), 1.0);
    }
`;

export const skeletonFSText = `
    precision mediump float;

    varying float vBoneIndex;
    uniform float highlightedBone;

    void main () {
        if (abs(vBoneIndex - highlightedBone) < 0.1) {
            gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
        } else {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
    }
`;

	
export const sBackVSText = `
    precision mediump float;

    attribute vec2 vertPosition;

    varying vec2 uv;

    void main() {
        gl_Position = vec4(vertPosition, 0.0, 1.0);
        uv = vertPosition;
        uv.x = (1.0 + uv.x) / 2.0;
        uv.y = (1.0 + uv.y) / 2.0;
    }
`;

export const sBackFSText = `
    precision mediump float;

    varying vec2 uv;

    void main () {
        gl_FragColor = vec4(0.1, 0.1, 0.1, 1.0);
        if (abs(uv.y-.33) < .005 || abs(uv.y-.67) < .005) {
            gl_FragColor = vec4(1, 1, 1, 1);
        }
    }

`;