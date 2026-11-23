// Tobi classroom enclosure. Units: mm. Dimensions below are design assumptions.
// Measure actual PCBs, component and pin heights, electrode, plug and print fit.
// +Z faces the user. The USB port points towards Y=0. Only base, lid and coupon
// are printable outputs. Other modes illustrate where removable electronics sit.
part = "exploded"; // [assembled,exploded,cutaway,lid-insertion,base,lid,coupon]
show_electronics = true;
show_wires = true;

case_w = 76;
case_d = 54;
base_h = 24;
wall = 2;
lid_t = 2.4;
side_fit = 0.3;       // Clearance per PCB edge in each guide
height_fit = 0.25;    // Extra slot height over PCB thickness
edge_hold = 1.2;      // Reserve an unpopulated strip along each PCB edge

oled_pcb_w = 28;
oled_pcb_d = 26;
oled_pcb_t = 1.6;
oled_glass_w = 24;
oled_glass_d = 16;
oled_glass_t = 1.5;
oled_active_w = 22;
oled_active_d = 12;
window_w = 22;       // Independent of PCB guides; align to actual active area
window_d = 12;
screen_dx = 0;       // Active window center relative to PCB center
screen_dy = 0;

touch_pcb_w = 15;
touch_pcb_d = 11;
touch_pcb_t = 1.6;
touch_skin = 1.2;    // Remaining cover above the pad; test with actual material
electrode_d = 8;

board_w = 18;
board_d = 24;
board_t = 1.6;
usb_w = 13;          // Clearance for the cable plug
usb_h = 8;
usb_body_w = 9;      // Mock connector soldered to the PCB
usb_body_d = 7;
usb_body_h = 3.2;
board_rise = 3;      // Space between bottom of PCB and interior floor
lid_hole_d = 2.4;
pilot_d = 1.7;       // Illustrative M2 self-tapping pilot: test screw on scrap
$fn = 36;

oled_x = 23;  oled_y = 31;
touch_x = 57; touch_y = 32;
board_x = 39; board_front_y = 2.5;
board_z = wall + board_rise;
oled_top = base_h - oled_glass_t - 0.2;
touch_top = base_h - 0.1;
guide_t = 1.5;
ledge_t = 1.2;
corner_r = 4;
boss_offset = 4.8;
epsilon = 0.02;
assembled_h = base_h + lid_t;
usb_center_z = board_z + board_t + usb_body_h / 2;
oled_front = oled_y - oled_pcb_d / 2;
touch_front = touch_y - touch_pcb_d / 2;

assert(side_fit > 0 && height_fit > 0 && edge_hold > side_fit);
assert(touch_skin > 0 && touch_skin <= lid_t && electrode_d + 2 < touch_pcb_w);
assert(window_w > 0 && window_d > 0);
assert(abs(screen_dx) + window_w / 2 < oled_pcb_w / 2 - edge_hold);
assert(abs(screen_dy) + window_d / 2 < oled_pcb_d / 2);
assert(oled_glass_w <= oled_pcb_w - 2 * edge_hold);
assert(usb_w > usb_body_w && usb_h > usb_body_h);
assert(usb_center_z - usb_h/2 > wall && usb_center_z + usb_h/2 < base_h);
assert(board_front_y + board_d + 6 < case_d - wall);
assert(oled_x + oled_pcb_w/2 + side_fit + guide_t < touch_x - touch_pcb_w/2 - side_fit - guide_t);
assert(board_x + board_w/2 - 0.5 < touch_x - touch_pcb_w/2 - side_fit - guide_t);
assert(pilot_d > 0 && pilot_d < lid_hole_d && wall < boss_offset);

module rounded_box(w, d, h, r) {
    hull() for (x = [r, w-r], y = [r, d-r])
        translate([x,y,0]) cylinder(r=r, h=h);
}
module boss_locations() {
    for (x=[boss_offset, case_w-boss_offset], y=[boss_offset, case_d-boss_offset])
        translate([x,y,0]) children();
}

// The board enters these insulated edge guides from the rear (+Y).
module board_guides() {
    start = board_front_y;
    for (sign=[-1,1]) {
        // Coordinates here measure outwards from the nominal PCB edge.
        translate([board_x + sign*board_w/2,start,0]) scale([sign,1,1]) {
            translate([-edge_hold,0,wall-epsilon])
                cube([edge_hold + side_fit + guide_t,board_d,board_rise+epsilon]);
            translate([side_fit,0,board_z-epsilon])
                cube([guide_t,board_d,board_t+height_fit+ledge_t+epsilon]);
            translate([-edge_hold,0,board_z+board_t+height_fit])
                cube([edge_hold+side_fit+guide_t,board_d,ledge_t]);
            translate([-edge_hold,-side_fit-1,wall-epsilon])
                cube([edge_hold+side_fit+guide_t,1,board_rise+board_t+epsilon]);
        }
    }
}

// One side stop at the entry of each panel guide blocks the board from sliding
// back out after the lid is fitted; the wires exit at the middle of each PCB.
module panel_keepers() {
    oled_tip = oled_x - oled_pcb_w/2 + 2.6;
    touch_tip = touch_x + touch_pcb_w/2 - 2.6;
    translate([wall-epsilon,oled_front-side_fit-1.6,wall-epsilon])
        cube([oled_tip-wall+epsilon,1.6,oled_top-0.35-wall+epsilon]);
    translate([touch_tip,touch_front-side_fit-1.6,wall-epsilon])
        cube([case_w-wall-touch_tip+epsilon,1.6,touch_top-0.35-wall+epsilon]);
}

module base() {
    difference() {
        union() {
            difference() {
                rounded_box(case_w,case_d,base_h,corner_r);
                translate([wall,wall,wall]) rounded_box(case_w-2*wall,case_d-2*wall,base_h,corner_r-wall);
            }
            boss_locations() translate([0,0,wall-epsilon]) cylinder(r=3.4,h=base_h-wall+epsilon);
            board_guides();
            panel_keepers();
        }
        translate([board_x-usb_w/2,-epsilon,usb_center_z-usb_h/2])
            cube([usb_w,wall+1,usb_h]);
        boss_locations() translate([0,0,base_h-8]) cylinder(d=pilot_d,h=8+epsilon);
    }
}

// Printed on the inside of the faceplate. Each side profile is a C in section.
// Upper spacers touch only clear PCB edges. The opposite ledges hold the back.
// Y-min is the open end, Y-max has a hard stop.
module face_guides(cx,cy,w,d,t,pcb_top) {
    front = cy - d/2;
    lip_bottom = pcb_top - t - height_fit - ledge_t;
    for (sign=[-1,1]) {
        translate([cx+sign*w/2,front,0]) scale([sign,1,1]) {
            translate([side_fit,0,lip_bottom]) cube([guide_t,d+side_fit,base_h-lip_bottom+epsilon]);
            translate([-edge_hold,0,lip_bottom]) cube([edge_hold+side_fit+guide_t,d,ledge_t]);
            translate([-edge_hold,0,pcb_top+0.08]) cube([edge_hold+side_fit+guide_t,d,base_h-pcb_top-0.08+epsilon]);
            translate([-edge_hold,d+side_fit-epsilon,lip_bottom])
                cube([edge_hold+side_fit+guide_t,guide_t,base_h-lip_bottom+epsilon]);
        }
    }
}
module display_window() {
    translate([oled_x+screen_dx-window_w/2,oled_y+screen_dy-window_d/2,base_h-epsilon])
        cube([window_w,window_d,lid_t+2*epsilon]);
}
module lid_world() {
    difference() {
        union() {
            translate([0,0,base_h]) rounded_box(case_w,case_d,lid_t,corner_r);
            face_guides(oled_x,oled_y,oled_pcb_w,oled_pcb_d,oled_pcb_t,oled_top);
            face_guides(touch_x,touch_y,touch_pcb_w,touch_pcb_d,touch_pcb_t,touch_top);
            // This tongue closes the rear of the ESP32 guide when the lid drops in.
            translate([board_x+board_w/2-3.5,board_front_y+board_d+side_fit,board_z+0.15])
                cube([3,2.4,base_h-board_z-0.15+epsilon]);
        }
        display_window();
        // Exterior recess: the inner mounting face stays flat for slide-in assembly.
        translate([touch_x,touch_y,base_h+touch_skin])
            cylinder(d=electrode_d+1,h=lid_t-touch_skin+epsilon);
        boss_locations() translate([0,0,base_h-epsilon]) cylinder(d=lid_hole_d,h=lid_t+2*epsilon);
    }
}
module for_printing_lid() {
    translate([0,case_d,assembled_h]) rotate([180,0,0]) children();
}
module oled_coupon_world() {
    // A true section of the faceplate containing both slides, stops and window.
    margin = 4;
    x0 = oled_x - oled_pcb_w/2 - margin;
    y0 = oled_front - margin;
    intersection() {
        lid_world();
        translate([x0,y0,0]) cube([oled_pcb_w+2*margin,oled_pcb_d+2*margin,assembled_h+epsilon]);
    }
}

// Simplified, removable hardware proxies in the SAME assembly coordinate frame.
// Component and connector outlines are placeholders for the actual purchased PCBs.
module oled_pcb() {
    translate([oled_x-oled_pcb_w/2,oled_front,oled_top-oled_pcb_t])
        cube([oled_pcb_w,oled_pcb_d,oled_pcb_t]);
}
module oled_glass() {
    translate([oled_x+screen_dx-oled_glass_w/2,oled_y+screen_dy-oled_glass_d/2,oled_top])
        cube([oled_glass_w,oled_glass_d,oled_glass_t]);
}
module oled_display() {
    translate([oled_x+screen_dx-oled_active_w/2,oled_y+screen_dy-oled_active_d/2,oled_top+oled_glass_t])
        cube([oled_active_w,oled_active_d,0.05]);
}
module ttp_pcb() {
    translate([touch_x-touch_pcb_w/2,touch_front,touch_top-touch_pcb_t])
        cube([touch_pcb_w,touch_pcb_d,touch_pcb_t]);
}
module ttp_pad() {
    translate([touch_x,touch_y,touch_top]) cylinder(d=electrode_d,h=0.04);
}
module c3_pcb() {
    translate([board_x-board_w/2,board_front_y,board_z]) cube([board_w,board_d,board_t]);
}
module c3_chip() {
    translate([board_x-3,board_front_y+12,board_z+board_t]) cube([6,6,1]);
}
module c3_usb() {
    // Open metal shell, with an actual visible cable socket at negative Y.
    difference() {
        translate([board_x-usb_body_w/2,board_front_y-2,board_z+board_t])
            cube([usb_body_w,usb_body_d,usb_body_h]);
        translate([board_x-usb_body_w/2+0.5,board_front_y-2-epsilon,board_z+board_t+0.5])
            cube([usb_body_w-1,usb_body_d-0.5,usb_body_h-1]);
    }
}
module wire_bundle(points) {
    for (i=[0:len(points)-2]) hull() {
        translate(points[i]) sphere(r=0.72,$fn=12);
        translate(points[i+1]) sphere(r=0.72,$fn=12);
    }
}
module wires() {
    // Conceptual cable paths only; each line represents a bundle.
    wire_bundle([[oled_x,oled_front+2,oled_top-oled_pcb_t],
                 [oled_x,oled_front+2,14],[25,15,10],[board_x-6,17,board_z+board_t]]);
    wire_bundle([[touch_x,touch_front+2,touch_top-touch_pcb_t],
                 [touch_x,touch_front+2,15],[54,20,11],[board_x+6,18,board_z+board_t]]);
}
module cut_base() {
    difference() {
        base();
        translate([-1,-1,wall+2]) cube([case_w+2,17,base_h+1]);
    }
}
module cut_lid() {
    intersection() {
        lid_world();
        translate([-1,39,0]) cube([case_w+2,case_d,assembled_h+1]);
    }
}
module oled_hardware() {
    color("#254e78") oled_pcb(); color("#222c34") oled_glass(); color("#71c9de") oled_display();
}
module touch_hardware() {
    color("#9d5440") ttp_pcb(); color("#e7b66c") ttp_pad();
}
module hardware(board_lift=0, panel_lift=0) {
    translate([0,0,board_lift]) {
        color("#28696a") c3_pcb(); color("#272c33") c3_chip(); color("#aab6bc") c3_usb();
    }
    translate([0,0,panel_lift]) { oled_hardware(); touch_hardware(); }
}

if (part=="base" || part=="assembly-base") base();
else if (part=="lid") for_printing_lid() lid_world();
else if (part=="coupon") for_printing_lid() oled_coupon_world();
else if (part=="assembly-lid") lid_world();
else if (part=="oled-pcb") oled_pcb();
else if (part=="oled-glass") oled_glass();
else if (part=="oled-display") oled_display();
else if (part=="ttp-pcb") ttp_pcb();
else if (part=="ttp-pad") ttp_pad();
else if (part=="c3-pcb") c3_pcb();
else if (part=="c3-chip") c3_chip();
else if (part=="c3-usb") c3_usb();
else if (part=="wires") wires();
else if (part=="section-base") cut_base();
else if (part=="section-lid") cut_lid();
else if (part=="lid-insertion") {
    color("#e9dfd1") lid_world();
    if (show_electronics) {
        translate([0,-14,0]) oled_hardware();
        translate([0,-6,0]) touch_hardware();
    }
}
else if (part=="assembled" || part=="exploded" || part=="cutaway") {
    exploded = part=="exploded";
    color("#c7baaa") if (part=="cutaway") cut_base(); else base();
    color("#e9dfd1") if (part=="cutaway") cut_lid();
        else translate([0,0,exploded ? 60 : 0]) lid_world();
    if (show_electronics) hardware(exploded ? 27 : 0, exploded ? 40 : 0);
    if (show_electronics && show_wires && !exploded) color("#b07348") wires();
}
else assert(false, str("Unknown part: ",part));
