import type { ExerciseMuscle } from "../api/exercises";

type Shape = [slug: string, path: string];

// Original, simplified anatomical vector. Text labels provide the exact muscle names.
const front: Shape[] = [
  ["upper_traps", "M77 48 Q83 55 89 55 L89 64 L75 57Z"],
  ["upper_traps", "M91 55 Q98 55 104 48 L106 57 L91 64Z"],
  ["front_delts", "M57 60 Q65 52 75 59 L72 79 L59 81Z"],
  ["front_delts", "M105 59 Q115 52 123 60 L121 81 L108 79Z"],
  ["side_delts", "M53 63 L59 60 L61 82 L53 87Z"],
  ["side_delts", "M121 60 L127 63 L127 87 L119 82Z"],
  ["upper_chest", "M75 62 L89 64 L89 76 L70 75Z"],
  ["upper_chest", "M91 64 L105 62 L110 75 L91 76Z"],
  ["middle_chest", "M70 77 L89 78 L89 94 L67 95Z"],
  ["middle_chest", "M91 78 L110 77 L113 95 L91 94Z"],
  ["lower_chest", "M67 97 L89 96 L89 108 L72 108Z"],
  ["lower_chest", "M91 96 L113 97 L108 108 L91 108Z"],
  ["biceps", "M55 88 L66 87 L63 116 L52 114Z"],
  ["biceps", "M114 87 L125 88 L128 114 L117 116Z"],
  ["brachialis", "M62 92 L67 90 L68 113 L63 119Z"],
  ["brachialis", "M113 90 L118 92 L117 119 L112 113Z"],
  ["triceps", "M49 88 L54 87 L53 116 L47 113Z"],
  ["triceps", "M126 87 L131 88 L133 113 L127 116Z"],
  ["brachioradialis", "M45 118 L54 119 L50 145 L42 143Z"],
  ["brachioradialis", "M126 119 L135 118 L138 143 L130 145Z"],
  ["forearms", "M54 120 L62 120 L57 153 L48 150Z"],
  ["forearms", "M118 120 L126 120 L132 150 L123 153Z"],
  ["upper_abs", "M79 111 L89 111 L89 134 L78 134Z"],
  ["upper_abs", "M91 111 L101 111 L102 134 L91 134Z"],
  ["lower_abs", "M78 136 L89 136 L89 163 L81 162Z"],
  ["lower_abs", "M91 136 L102 136 L99 162 L91 163Z"],
  ["obliques", "M67 111 L77 111 L76 158 L70 149Z"],
  ["obliques", "M103 111 L113 111 L110 149 L104 158Z"],
  ["lats", "M63 97 L68 100 L71 126 L66 124Z"],
  ["lats", "M112 100 L117 97 L114 124 L109 126Z"],
  ["hip_flexors", "M72 164 L87 166 L83 183 L70 183Z"],
  ["hip_flexors", "M93 166 L108 164 L110 183 L97 183Z"],
  ["adductors", "M84 185 L90 184 L88 242 L81 227Z"],
  ["adductors", "M90 184 L96 185 L99 227 L92 242Z"],
  ["quads", "M66 185 L82 185 L79 245 L68 237Z"],
  ["quads", "M98 185 L114 185 L112 237 L101 245Z"],
  ["glute_med", "M68 171 L80 170 L77 185 L68 184Z"],
  ["glute_med", "M100 170 L112 171 L112 184 L103 185Z"],
  ["gastrocnemius", "M69 252 L81 251 L78 291 L70 289Z"],
  ["gastrocnemius", "M99 251 L111 252 L110 289 L102 291Z"],
  ["soleus", "M72 291 L80 293 L78 317 L74 319Z"],
  ["soleus", "M100 293 L108 291 L106 319 L102 317Z"],
];

const back: Shape[] = [
  ["upper_traps", "M74 52 L89 56 L89 78 L68 70Z"],
  ["upper_traps", "M91 56 L106 52 L112 70 L91 78Z"],
  ["mid_traps", "M70 72 L89 80 L89 96 L69 93Z"],
  ["mid_traps", "M91 80 L110 72 L111 93 L91 96Z"],
  ["rhomboids", "M76 96 L89 98 L89 112 L78 107Z"],
  ["rhomboids", "M91 98 L104 96 L102 107 L91 112Z"],
  ["rear_delts", "M57 60 Q65 53 74 58 L72 81 L57 84Z"],
  ["rear_delts", "M106 58 Q115 53 123 60 L123 84 L108 81Z"],
  ["side_delts", "M52 65 L57 61 L58 84 L51 88Z"],
  ["side_delts", "M123 61 L128 65 L129 88 L122 84Z"],
  ["lats", "M67 94 L77 105 L79 139 L71 146 L64 123Z"],
  ["lats", "M103 105 L113 94 L116 123 L109 146 L101 139Z"],
  ["spinal_erectors", "M81 113 L89 113 L89 164 L82 158Z"],
  ["spinal_erectors", "M91 113 L99 113 L98 158 L91 164Z"],
  ["triceps", "M51 87 L63 87 L62 117 L49 114Z"],
  ["triceps", "M117 87 L129 87 L131 114 L118 117Z"],
  ["biceps", "M63 89 L68 89 L66 112 L62 116Z"],
  ["biceps", "M112 89 L117 89 L118 116 L114 112Z"],
  ["forearms", "M46 120 L60 119 L55 153 L42 149Z"],
  ["forearms", "M120 119 L134 120 L138 149 L125 153Z"],
  ["glute_med", "M68 162 L81 163 L78 179 L65 178Z"],
  ["glute_med", "M99 163 L112 162 L115 178 L102 179Z"],
  ["glutes", "M67 180 Q78 174 88 181 L88 203 L74 205Z"],
  ["glutes", "M92 181 Q102 174 113 180 L106 205 L92 203Z"],
  ["hamstrings", "M68 207 L84 208 L81 248 L70 243Z"],
  ["hamstrings", "M96 208 L112 207 L110 243 L99 248Z"],
  ["adductors", "M84 207 L89 205 L88 238 L82 245Z"],
  ["adductors", "M91 205 L96 207 L98 245 L92 238Z"],
  ["gastrocnemius", "M69 253 L82 252 L78 287 L70 290Z"],
  ["gastrocnemius", "M98 252 L111 253 L110 290 L102 287Z"],
  ["soleus", "M72 290 L79 290 L77 318 L73 319Z"],
  ["soleus", "M101 290 L108 290 L107 319 L103 318Z"],
];

function BodyView({
  label,
  shapes,
  roles,
}: {
  label: string;
  shapes: Shape[];
  roles: Map<string, string>;
}) {
  return (
    <div className="muscle-body-view">
      <span>{label}</span>
      <svg viewBox="0 0 180 350" aria-hidden="true">
        <ellipse cx="90" cy="29" rx="17" ry="21" className="body-base" />
        <path
          d="M80 47 L80 53 L66 55 Q52 57 48 72 L41 121 L34 151 L42 157 L50 153 L60 120 L66 95 L68 147 L64 184 L66 247 L70 322 L80 324 L89 250 L90 195 L91 250 L100 324 L110 322 L114 247 L116 184 L112 147 L114 95 L120 120 L130 153 L138 157 L146 151 L139 121 L132 72 Q128 57 114 55 L100 53 L100 47Z"
          className="body-base"
        />
        {shapes.map(([slug, d], index) => (
          <path
            key={`${slug}-${index}`}
            d={d}
            className={`body-muscle body-muscle-${roles.get(slug) ?? "idle"}`}
          />
        ))}
      </svg>
    </div>
  );
}

export function MuscleDiagram({ muscles }: { muscles: ExerciseMuscle[] }) {
  const roles = new Map(muscles.map((muscle) => [muscle.slug, muscle.role]));
  return (
    <div className="muscle-diagram">
      <div className="muscle-views">
        <BodyView label="Front" shapes={front} roles={roles} />
        <BodyView label="Back" shapes={back} roles={roles} />
      </div>
      <div className="muscle-legend">
        <span>
          <i className="legend-primary" />
          Primary
        </span>
        <span>
          <i className="legend-secondary" />
          Secondary
        </span>
      </div>
    </div>
  );
}
