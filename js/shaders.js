const shaders = {
    vertexShader: `#version 300 es
        in vec4 aPosition;
        in vec3 aNormal;
        
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uNormalMatrix;
        
        out vec3 vNormal;
        out vec3 vPosition;
        
        void main() {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;
            vNormal = mat3(uNormalMatrix) * aNormal;
            vPosition = vec3(uModelViewMatrix * aPosition);
        }
    `,

    fragmentShader: `#version 300 es
        precision highp float;
        
        in vec3 vNormal;
        in vec3 vPosition;
        
        uniform vec3 uLightPosition;
        uniform vec3 uLightColor;
        uniform vec3 uAmbientColor;
        uniform vec3 uDiffuseColor;
        uniform vec3 uSpecularColor;
        uniform float uShininess;
        
        out vec4 fragColor;
        
        void main() {
            // 环境光
            vec3 ambient = uAmbientColor;
            
            // 漫反射
            vec3 normal = normalize(vNormal);
            vec3 lightDir = normalize(uLightPosition - vPosition);
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 diffuse = diff * uDiffuseColor * uLightColor;
            
            // 镜面反射
            vec3 viewDir = normalize(-vPosition);
            vec3 reflectDir = reflect(-lightDir, normal);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
            vec3 specular = spec * uSpecularColor * uLightColor;
            
            vec3 result = ambient + diffuse + specular;
            fragColor = vec4(result, 1.0);
        }
    `
};
