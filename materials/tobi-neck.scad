// Tobi 双轴颈部结构方案，单位 mm。示例尺寸需按舵机、舵盘和载荷实测。
// 将此文件放在 Helmet1.stl 和 Core .stl 旁边，按 F5 预览（Core 后有空格）。
// 在源码仓库的 course-kit/enclosure 内运行时可将 mesh_dir 改为 "../upstream/3d-models"。
mesh_dir = ".";
pitch = 0; // [-12:1:12] 相对中位的俯仰角；正角使面窗朝下。
yaw = 0;   // [-18:1:18] 相对中位的水平转角。
part = "assembly"; // [assembly,yoke,base]
show_axes = false;

$fn = 40;
pivot_h = 62;
ear_center = [0.1, -2.1, 18.5]; // 原头盔左右圆形侧面的近似中心
arm_x = 28.5;        // U 形架立臂中心至偏航轴的距离
bridge_z = 35.5;     // 横梁底面
servo_body = [23,12,22]; // 常见微型舵机的简化包络；安装耳、接线与花键待实测
base_width = 78;
base_depth = 55;

module box(center,size) {
    translate(center) cube(size,center=true);
}
module disc_z(center,diameter,height) {
    translate(center) cylinder(d=diameter,h=height,center=true);
}
module disc_x(center,diameter,length) {
    translate(center) rotate([0,90,0]) cylinder(d=diameter,h=length,center=true);
}
module turntable() {
    rotate([0,0,yaw]) children();
}
module tilt_head() {
    translate([0,0,pivot_h]) rotate([pitch,0,0]) translate([0,0,-pivot_h]) children();
}
module raw_head_coordinates() {
    translate([0,0,pivot_h]-ear_center) children();
}
module helmet() {
    raw_head_coordinates() import(str(mesh_dir,"/Helmet1.stl"),convexity=8);
}
module core() {
    raw_head_coordinates() import(str(mesh_dir,"/Core .stl"),convexity=8);
}
// A display outline is included to show which way the head faces.
module display_proxy() {
    raw_head_coordinates() box([0,-11.6,17.8],[25,1.5,17]);
}
module eyes() {
    for (x=[-5.6,5.6]) raw_head_coordinates() box([x,-12.4,18.5],[4.4,0.35,6.5]);
}
// The front of the pedestal stays open so the lower servo is visible.
module base() {
    linear_extrude(height=4) hull()
        for (x=[-base_width/2+5,base_width/2-5], y=[-base_depth/2+5,base_depth/2-5])
            translate([x,y]) circle(r=5);
    for (x=[-9.1,18.1]) box([x,0,13],[4,16,18]);
}
module yaw_servo() {
    box([4.5,0,15],servo_body);
    disc_z([0,0,27.8],8.5,3.6);
}
module yaw_hub() {
    disc_z([0,0,32.7],15,5.7);
}
module yoke() {
    box([0,0,bridge_z+2],[arm_x*2+4,13,4]);
    for(x=[-arm_x,arm_x]) {
        hull() {
            box([x,0,bridge_z+2],[4,13,3.8]);
            disc_x([x,0,pivot_h],12,4);
        }
    }
}
module pitch_servo() {
    box([42,0,pivot_h-5],[servo_body.z,servo_body.y,servo_body.x]);
    disc_x([30.6,0,pivot_h],8,2.5);
}
// A drive pad at one ear and a free pivot at the other. Joint interfaces
// are envelopes. Select the real horn, opposite bearing and head restraint first.
module ear_pads() {
    for(s=[-1,1]) {
        disc_x([s*25,0,pivot_h],12.5,1.8);
        disc_x([s*27.3,0,pivot_h],5.8,3.2);
    }
}
module assembly() {
    color("#68717c") base();
    color("#37847e") yaw_servo();
    turntable() {
        color("#498a85") yaw_hub();
        color("#405c69") yoke();
        color("#bd754c") pitch_servo();
        tilt_head() {
            color("#9d6445") ear_pads();
            color("#e4b16a") helmet();
            color("#686966") core();
            color("#303e40") display_proxy();
            color("#9cdbdd") eyes();
        }
    }
    if (show_axes) {
        %color("SeaGreen") disc_z([0,0,24],1,65);
        %turntable() color("Coral") disc_x([0,0,pivot_h],1,114);
    }
}
// Source groups also drive the geometry in the classroom animation.
if (part=="assembly") assembly();
else if (part=="base") base();
else if (part=="yoke") yoke();
else if (part=="yaw_servo") yaw_servo();
else if (part=="pitch_servo") pitch_servo();
else if (part=="yaw_hub") yaw_hub();
else if (part=="ear_pads") ear_pads();
else if (part=="display") display_proxy();
else if (part=="eyes") eyes();
