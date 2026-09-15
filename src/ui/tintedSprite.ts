import 'phaser';

/**
 * Создаёт tinted SVG-спрайт и добавляет в контейнер.
 * SVG грузятся белыми, цвет команды задаётся через tint.
 */
export function addTintedSprite(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    key: string,
    color: number,
    displayWidth: number,
    displayHeight: number
): Phaser.GameObjects.Image {
    const img = scene.add.image(0, 0, key);
    img.setTint(color);
    img.setDisplaySize(displayWidth, displayHeight);
    img.setData('tintable', true);
    parent.add(img);
    return img;
}
