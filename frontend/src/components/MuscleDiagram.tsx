import type { ExerciseMuscle } from "../api/exercises";
import bodyDraft from "../assets/muscle-body-draft-v1.png";

type Shape = [slug: string, path: string];

// Coordinates follow the two figures in the local design illustration. Each
// SVG region keeps the same slug as the API, so the image itself never decides
// which muscles are primary or secondary for an exercise.
const front: Shape[] = [
  [
    "upper_traps",
    "M375 183 Q406 169 425 145 Q427 170 437 195 Q407 187 375 183Z",
  ],
  [
    "upper_traps",
    "M500 195 Q510 170 510 145 Q529 169 561 183 Q529 187 500 195Z",
  ],
  [
    "front_delts",
    "M315 244 Q323 208 349 194 Q370 186 380 204 Q376 236 317 280 Q309 267 315 244Z",
  ],
  [
    "front_delts",
    "M554 204 Q564 186 585 194 Q611 208 619 244 Q625 267 617 280 Q558 236 554 204Z",
  ],
  [
    "side_delts",
    "M303 219 Q314 195 340 189 Q310 220 309 266 L307 279 Q296 256 303 219Z",
  ],
  [
    "side_delts",
    "M594 189 Q620 195 631 219 Q638 256 627 279 L625 266 Q624 220 594 189Z",
  ],
  [
    "upper_chest",
    "M389 211 Q428 203 455 211 Q462 216 461 237 L461 240 Q411 239 363 240 Q369 220 389 211Z",
  ],
  [
    "upper_chest",
    "M479 211 Q506 203 545 211 Q565 220 571 240 Q523 239 469 240 L469 237 Q468 216 479 211Z",
  ],
  [
    "middle_chest",
    "M363 244 Q409 243 461 244 L461 274 Q425 282 388 274 Q370 267 363 244Z",
  ],
  [
    "middle_chest",
    "M469 244 Q521 243 571 244 Q564 267 546 274 Q509 282 469 274Z",
  ],
  [
    "lower_chest",
    "M388 278 Q426 286 461 278 L461 293 Q441 303 424 299 Q403 297 388 278Z",
  ],
  [
    "lower_chest",
    "M469 278 Q504 286 546 278 Q531 297 506 299 Q489 303 469 293Z",
  ],
  [
    "biceps",
    "M320 289 Q336 275 350 285 Q356 314 340 352 Q326 377 310 370 Q300 345 307 316Z",
  ],
  [
    "biceps",
    "M580 285 Q594 275 610 289 L623 316 Q630 345 620 370 Q604 377 590 352 Q574 314 580 285Z",
  ],
  [
    "brachialis",
    "M302 298 Q310 285 318 284 Q307 329 305 364 L296 375 Q291 340 302 298Z",
  ],
  [
    "brachialis",
    "M612 284 Q620 285 628 298 Q639 340 634 375 L625 364 Q623 329 612 284Z",
  ],
  [
    "triceps",
    "M287 308 Q293 289 303 283 Q294 317 295 348 L282 374 Q278 349 287 308Z",
  ],
  [
    "triceps",
    "M627 283 Q637 289 643 308 Q652 349 648 374 L635 348 Q636 317 627 283Z",
  ],
  [
    "brachioradialis",
    "M269 392 Q283 379 297 389 Q290 433 259 483 L249 494 Q250 458 269 392Z",
  ],
  [
    "brachioradialis",
    "M633 389 Q647 379 661 392 Q680 458 681 494 L671 483 Q640 433 633 389Z",
  ],
  [
    "forearms",
    "M300 390 Q312 384 322 397 Q309 448 266 491 L258 488 Q286 440 300 390Z",
  ],
  [
    "forearms",
    "M608 397 Q618 384 630 390 Q644 440 672 488 L664 491 Q621 448 608 397Z",
  ],
  [
    "upper_abs",
    "M422 306 Q440 301 460 307 L460 380 Q442 382 423 378 Q417 346 422 306Z",
  ],
  ["upper_abs", "M470 307 Q490 301 508 306 Q513 346 507 378 Q488 382 470 380Z"],
  [
    "lower_abs",
    "M423 384 Q443 381 460 384 L460 506 Q451 512 445 497 Q426 454 423 384Z",
  ],
  ["lower_abs", "M470 384 Q487 381 507 384 Q504 454 485 497 Q479 512 470 506Z"],
  [
    "obliques",
    "M380 306 Q397 312 414 308 Q410 366 422 440 Q402 419 386 399 Q376 372 380 306Z",
  ],
  [
    "obliques",
    "M516 308 Q533 312 550 306 Q554 372 544 399 Q528 419 508 440 Q520 366 516 308Z",
  ],
  ["lats", "M353 299 Q367 300 377 308 L377 403 Q360 381 355 365Z"],
  ["lats", "M553 308 Q563 300 577 299 L575 365 Q570 381 553 403Z"],
  ["hip_flexors", "M374 457 Q400 472 425 511 L413 560 Q398 527 366 498Z"],
  ["hip_flexors", "M505 511 Q530 472 556 457 L564 498 Q532 527 517 560Z"],
  ["glute_med", "M360 453 Q374 455 391 474 L375 518 Q360 503 356 481Z"],
  ["glute_med", "M539 474 Q556 455 570 453 L574 481 Q570 503 555 518Z"],
  [
    "adductors",
    "M428 534 Q446 545 461 538 L457 617 Q451 664 439 687 Q429 661 425 627Z",
  ],
  [
    "adductors",
    "M469 538 Q484 545 502 534 L505 627 Q501 661 491 687 Q479 664 473 617Z",
  ],
  [
    "quads",
    "M378 524 Q398 515 419 540 Q425 592 416 642 Q410 669 394 676 Q369 651 365 608 Q364 554 378 524Z",
  ],
  [
    "quads",
    "M511 540 Q532 515 552 524 Q566 554 565 608 Q561 651 536 676 Q520 669 514 642 Q505 592 511 540Z",
  ],
  [
    "gastrocnemius",
    "M369 739 Q383 731 397 742 Q401 772 389 826 L371 898 Q355 874 356 841 Q357 783 369 739Z",
  ],
  [
    "gastrocnemius",
    "M533 742 Q547 731 561 739 Q573 783 574 841 Q575 874 559 898 L541 826 Q529 772 533 742Z",
  ],
  [
    "soleus",
    "M402 752 Q412 777 414 805 Q408 872 399 908 L394 908 Q398 823 402 752Z",
  ],
  [
    "soleus",
    "M528 752 Q532 823 536 908 L531 908 Q522 872 516 805 Q518 777 528 752Z",
  ],
];

const back: Shape[] = [
  ["upper_traps", "M1017 154 Q1050 137 1065 111 L1063 210 Q1027 183 983 194Z"],
  ["upper_traps", "M1079 111 Q1094 137 1127 154 L1161 194 Q1117 183 1081 210Z"],
  ["mid_traps", "M1020 203 Q1048 213 1062 226 L1062 302 Q1035 283 1018 258Z"],
  ["mid_traps", "M1082 226 Q1096 213 1124 203 L1126 258 Q1109 283 1082 302Z"],
  ["rhomboids", "M971 234 Q993 216 1012 231 L1020 291 Q994 285 976 270Z"],
  ["rhomboids", "M1132 231 Q1151 216 1173 234 L1168 270 Q1150 285 1124 291Z"],
  [
    "rear_delts",
    "M943 208 Q964 189 990 192 L1007 213 Q992 246 968 277 Q949 269 936 253Z",
  ],
  [
    "rear_delts",
    "M1157 213 L1174 192 Q1200 189 1221 208 L1228 253 Q1215 269 1196 277 Q1172 246 1157 213Z",
  ],
  [
    "side_delts",
    "M913 219 Q922 198 945 193 Q931 223 929 259 L921 282 Q908 260 913 219Z",
  ],
  [
    "side_delts",
    "M1219 193 Q1242 198 1251 219 Q1256 260 1248 282 L1240 259 Q1238 223 1219 193Z",
  ],
  [
    "lats",
    "M972 280 Q1010 301 1048 343 L1059 431 Q1029 420 1005 387 Q985 354 972 280Z",
  ],
  [
    "lats",
    "M1096 343 Q1134 301 1172 280 Q1159 354 1139 387 Q1115 420 1085 431Z",
  ],
  [
    "spinal_erectors",
    "M1050 303 L1063 314 L1063 464 Q1042 440 1032 421 Q1045 379 1050 303Z",
  ],
  [
    "spinal_erectors",
    "M1081 314 L1094 303 Q1099 379 1112 421 Q1102 440 1081 464Z",
  ],
  [
    "triceps",
    "M909 289 Q925 278 943 292 Q959 330 943 367 Q927 389 909 380 Q900 338 909 289Z",
  ],
  [
    "triceps",
    "M1201 292 Q1219 278 1235 289 Q1244 338 1235 380 Q1217 389 1201 367 Q1185 330 1201 292Z",
  ],
  [
    "forearms",
    "M896 388 Q912 383 926 396 Q907 450 863 492 L852 488 Q877 435 896 388Z",
  ],
  [
    "forearms",
    "M1218 396 Q1232 383 1248 388 Q1267 435 1292 488 L1281 492 Q1237 450 1218 396Z",
  ],
  [
    "glute_med",
    "M982 442 Q1006 434 1027 449 Q1001 472 988 507 Q974 489 982 442Z",
  ],
  [
    "glute_med",
    "M1117 449 Q1138 434 1162 442 Q1170 489 1156 507 Q1143 472 1117 449Z",
  ],
  [
    "glutes",
    "M1010 462 Q1041 451 1062 477 L1063 539 Q1039 559 991 550 Q978 508 1010 462Z",
  ],
  [
    "glutes",
    "M1082 477 Q1103 451 1134 462 Q1166 508 1153 550 Q1105 559 1081 539Z",
  ],
  [
    "hamstrings",
    "M990 556 Q1011 559 1030 556 Q1048 607 1032 689 Q1017 701 991 664 Q980 618 990 556Z",
  ],
  [
    "hamstrings",
    "M1114 556 Q1133 559 1154 556 Q1164 618 1153 664 Q1127 701 1112 689 Q1096 607 1114 556Z",
  ],
  [
    "adductors",
    "M1036 555 Q1051 548 1062 555 Q1063 640 1046 698 Q1038 683 1033 660Z",
  ],
  [
    "adductors",
    "M1082 555 Q1093 548 1108 555 L1111 660 Q1106 683 1098 698 Q1081 640 1082 555Z",
  ],
  [
    "gastrocnemius",
    "M969 722 Q989 711 1005 733 Q1007 785 996 816 Q986 833 969 818 Q955 789 969 722Z",
  ],
  [
    "gastrocnemius",
    "M1139 733 Q1155 711 1175 722 Q1189 789 1175 818 Q1158 833 1148 816 Q1137 785 1139 733Z",
  ],
  ["soleus", "M1010 733 Q1022 775 1022 818 L1004 902 Q998 868 1001 821Z"],
  [
    "soleus",
    "M1134 733 L1143 821 Q1146 868 1140 902 L1122 818 Q1122 775 1134 733Z",
  ],
];

function BodyView({
  label,
  shapes,
  imageOffset,
  roles,
}: {
  label: string;
  shapes: Shape[];
  imageOffset: number;
  roles: Map<string, ExerciseMuscle["role"]>;
}) {
  return (
    <div className="muscle-body-view">
      <span>{label}</span>
      <svg viewBox="0 0 585 1024" aria-hidden="true">
        <image
          href={bodyDraft}
          x={-imageOffset}
          y="0"
          width="1536"
          height="1024"
        />
        <g transform={`translate(${-imageOffset} 0)`}>
          {shapes.map(([slug, d], index) => (
            <path
              key={`${slug}-${index}`}
              d={d}
              data-muscle={slug}
              data-role={roles.get(slug) ?? "idle"}
              className={`body-muscle body-muscle-${roles.get(slug) ?? "idle"}`}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

export function MuscleDiagram({ muscles }: { muscles: ExerciseMuscle[] }) {
  const roles = new Map(muscles.map((muscle) => [muscle.slug, muscle.role]));
  return (
    <div className="muscle-diagram">
      <div className="muscle-views">
        <BodyView
          label="Front"
          shapes={front}
          imageOffset={175}
          roles={roles}
        />
        <BodyView label="Back" shapes={back} imageOffset={775} roles={roles} />
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
