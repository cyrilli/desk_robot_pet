// Teaching example: measure your actual modules before printing.
// Units: mm. This is a new parametric enclosure, not Tobi's original CAD.
part = "base"; // base, lid, coupon
outer_w = 54;
outer_h = 60;
depth = 28;
wall = 2;
clearance = 0.3; // per side
window_w = 25;
window_h = 14;
usb_w = 14;
usb_h = 9;
$fn = 32;
assert(outer_w > window_w+4*wall && outer_h > window_h+4*wall);
assert(depth > usb_h+2*wall && clearance >= 0);
module base() {
 difference() {
  cube([outer_w,outer_h,depth]);
  translate([wall,wall,wall]) cube([outer_w-2*wall,outer_h-2*wall,depth]);
  translate([(outer_w-usb_w)/2,-1,wall+2]) cube([usb_w,wall+2,usb_h]);
 }
}
module lid() {
 difference() {
  union() {
   cube([outer_w,outer_h,wall]);
   translate([wall+clearance,wall+clearance,wall-0.1])
    difference() {
     cube([outer_w-2*(wall+clearance),outer_h-2*(wall+clearance),3.1]);
     translate([wall,wall,-1]) cube([outer_w-2*(2*wall+clearance),outer_h-2*(2*wall+clearance),6]);
    }
  }
  translate([(outer_w-window_w)/2,(outer_h-window_h)/2,-1]) cube([window_w,window_h,wall+2]);
 }
}
module coupon() {
 difference() {
  cube([window_w+12,window_h+12,wall]);
  translate([6,6,-1]) cube([window_w,window_h,wall+2]);
 }
}
if(part=="base") base();
else if(part=="lid") lid();
else if(part=="coupon") coupon();
else assert(false,"Choose base, lid or coupon");
