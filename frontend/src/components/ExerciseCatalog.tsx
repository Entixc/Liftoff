import type { Exercise } from "../api/exercises";

type ExerciseCatalogProps = {
  exercises: Exercise[];
};

const categoryLabels: Record<string, string> = {
  arms: "Руки",
  back: "Спина",
  chest: "Грудь",
  core: "Кор",
  legs: "Ноги",
  shoulders: "Плечи",
};

export function ExerciseCatalog({ exercises }: ExerciseCatalogProps) {
  const exercisesByCategory = exercises.reduce<Record<string, Exercise[]>>(
    (groups, exercise) => {
      const categoryExercises = groups[exercise.category] ?? [];
      categoryExercises.push(exercise);
      groups[exercise.category] = categoryExercises;
      return groups;
    },
    {},
  );

  return (
    <section>
      <h2>Каталог упражнений</h2>

      {Object.entries(exercisesByCategory).map(
        ([category, categoryExercises]) => (
          <div key={category}>
            <h3>{categoryLabels[category] ?? category}</h3>
            <ul>
              {categoryExercises.map((exercise) => (
                <li key={exercise.id}>
                  {exercise.name}
                  {exercise.is_bodyweight && " — с собственным весом"}
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </section>
  );
}
