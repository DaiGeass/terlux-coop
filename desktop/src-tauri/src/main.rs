// Evita que se abra una consola detrás de la ventana en Windows (modo release).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    terlux_desktop_lib::run()
}
