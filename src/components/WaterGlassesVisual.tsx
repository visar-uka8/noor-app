import {
  getWaterGlassCount,
  getWaterGoalGlassCount,
} from "@/lib/water-quick-log";

type WaterGlassesVisualProps = {
  waterLiters: number;
  waterGoalLiters: number;
};

export function WaterGlassesVisual({
  waterLiters,
  waterGoalLiters,
}: WaterGlassesVisualProps) {
  const totalGlasses = getWaterGoalGlassCount(waterGoalLiters);
  const filledGlasses = Math.min(
    totalGlasses,
    getWaterGlassCount(waterLiters),
  );

  return (
    <div
      className="mt-1.5 flex flex-wrap gap-1"
      aria-label={`${filledGlasses} von ${totalGlasses} Gläsern`}
    >
      {Array.from({ length: totalGlasses }).map((_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="text-base leading-none"
          style={{ opacity: index < filledGlasses ? 1 : 0.3 }}
        >
          🥛
        </span>
      ))}
    </div>
  );
}
