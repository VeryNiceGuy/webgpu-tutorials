@vertex
fn vertexMain(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32>
{
    return vec4(position, 1);
}

@fragment
fn fragmentMain() -> @location(0) vec4<f32>
{
    return vec4(1, 1, 1, 1);
} 