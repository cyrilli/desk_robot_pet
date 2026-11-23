// Course accessory, dimensions in mm. Do not scale the original shell to fit it.
pet_name = "MIKA";
plate_w = 32;
plate_h = 12;
plate_t = 2;
letter_h = 0.8;
font_size = 6;
$fn = 40;
linear_extrude(plate_t)
    offset(r=2) square([plate_w-4, plate_h-4], center=true);
translate([0,0,plate_t-0.05])
    linear_extrude(letter_h+0.05)
        text(pet_name, size=font_size, halign="center", valign="center", font="Liberation Sans:style=Bold");
