import { useState } from 'react';
import { gameBridge } from '../ui/react/gameBridge';
import { useBridge } from './useBridge';

interface GuideEntry {
    name: string;
    desc: string;
    stats?: string;
}

interface GuideCategory {
    id: string;
    title: string;
    entries: GuideEntry[];
}

const CATEGORIES: GuideCategory[] = [
    {
        id: 'units',
        title: 'Юниты',
        entries: [
            {
                name: 'Танк',
                desc: 'Основная боевая единица. Автоматически атакует ближайшего врага в радиусе 200. В облаке вероятности выше шанс осечки (урон себе).',
                stats: 'Цена: 50 | HP: 100 | Урон: 10 | Скорость: 150'
            },
            {
                name: 'Строитель',
                desc: 'Строит фабрики. Выберите строителя и нажмите «Построить фабрику» — он превратится в фабрику на своём месте.',
                stats: 'Цена: 25 | HP: 100 | Скорость: 100'
            },
            {
                name: 'Харвестер',
                desc: 'Добывает кредиты у квантовых жил. Автоматически идёт к ближайшей жиле и качает ресурсы, пока стоит в зоне добычи. В облаке добыча ×2, но есть шанс сбоя.',
                stats: 'Цена: 75 | HP: 100 | Скорость: 120'
            }
        ]
    },
    {
        id: 'buildings',
        title: 'Здания',
        entries: [
            {
                name: 'Фабрика',
                desc: 'Производит танки. Выберите фабрику и нажмите «Произвести танк». В облаке вероятности производство ускоряется вдвое.',
                stats: 'Цена: 100 | HP: 500 | Время производства: 4 сек'
            },
            {
                name: 'Командный центр (HQ)',
                desc: 'База команды. Позволяет создавать харвестеров. Уничтожение HQ врага — победа, потеря своего — поражение.',
                stats: 'HP: 1000'
            },
            {
                name: 'Лазерная башня',
                desc: 'Нейтральная башня. Атакует всех в радиусе 250. В облаке вероятности переключается в режим лечения союзников.',
                stats: 'HP: 150 | Урон: 15 | Радиус: 250'
            },
            {
                name: 'Стена',
                desc: 'Нейтральное препятствие. Блокирует движение, но может случайно исчезать и появляться (квантовый эффект).',
                stats: 'HP: 500'
            }
        ]
    },
    {
        id: 'items',
        title: 'Предметы',
        entries: [
            {
                name: 'Квантовый артефакт',
                desc: 'Парящий кристалл. Вне облака лечит юнита на +25 HP при сборе. Внутри облака вероятности становится опасным и наносит −15 HP.',
                stats: 'Эффект: +25 HP / −15 HP'
            }
        ]
    },
    {
        id: 'areas',
        title: 'Области',
        entries: [
            {
                name: 'Квантовая жила',
                desc: 'Золотистая зона добычи ресурсов. Харвестер качает кредиты, находясь в радиусе 150 от жилы. Жилы медленно дрейфуют по карте.',
                stats: 'Радиус: 130 | Добыча: 3–8 за тик'
            },
            {
                name: 'Облако вероятности',
                desc: 'Фиолетовая зона квантовой неопределённости. Ускоряет добычу и производство, но добавляет риск: сбой добычи, осечки танков, превращение артефактов и башен.',
                stats: 'Добыча ×2 | Шанс сбоя: 25%'
            }
        ]
    },
    {
        id: 'mechanics',
        title: 'Механики',
        entries: [
            {
                name: 'Добыча ресурсов',
                desc: 'Кредиты дают харвестеры у жил + пассивный доход 1/сек. Тратьте их на юнитов и здания. Следите за жилами — они плавают по карте.'
            },
            {
                name: 'Конверсия',
                desc: 'Юниты могут спонтанно перейти к врагу (квантовый эффект). В облаке шанс выше, длительность дольше. Через время юнит возвращается.'
            },
            {
                name: 'ИИ противника',
                desc: 'Красная команда строит экономику, фабрики и шлёт волны танков к вашей базе. Чем дольше игра — тем сильнее давление.'
            },
            {
                name: 'Победа и поражение',
                desc: 'Уничтожьте красный HQ, чтобы победить. Защищайте свой HQ — его потеря означает поражение. Пауза — Esc.'
            }
        ]
    }
];

export function GuidePanel() {
    const visible = useBridge(s => s.guideVisible);
    const [active, setActive] = useState('units');

    if (!visible) return null;

    const category = CATEGORIES.find(c => c.id === active) ?? CATEGORIES[0];

    return (
        <div id="guide-overlay">
            <div id="guide-panel">
                <div id="guide-header">
                    <h2>📖 Справочник</h2>
                    <button id="guide-close" onClick={() => gameBridge.setGuideVisible(false)}>✕</button>
                </div>
                <div id="guide-tabs">
                    {CATEGORIES.map(c => (
                        <button
                            key={c.id}
                            className={`guide-tab${c.id === active ? ' active' : ''}`}
                            onClick={() => setActive(c.id)}
                        >
                            {c.title}
                        </button>
                    ))}
                </div>
                <div id="guide-content">
                    {category.entries.map(e => (
                        <div key={e.name} className="guide-entry">
                            <div className="guide-entry-name">{e.name}</div>
                            <div className="guide-entry-desc">{e.desc}</div>
                            {e.stats && <div className="guide-entry-stats">{e.stats}</div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}