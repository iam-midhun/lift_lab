// General exercise muscle-emphasis estimates shared by the library and workout logger.
// Stored exercise.muscle_activation values take priority over these fallbacks.

const activationDefaults = [
  { test: /incline/i, items: [
    { muscle: 'Pectoralis major', region: 'Clavicular head · Upper chest', level: 'high', role: 'primary' },
    { muscle: 'Deltoid', region: 'Anterior deltoid · Front shoulder', level: 'moderate', role: 'secondary' },
    { muscle: 'Triceps brachii', region: 'All three heads', level: 'moderate', role: 'secondary' },
  ] },
  { test: /decline/i, items: [
    { muscle: 'Pectoralis major', region: 'Sternal / lower chest emphasis', level: 'high', role: 'primary' },
    { muscle: 'Triceps brachii', region: 'Lateral and medial heads', level: 'moderate', role: 'secondary' },
    { muscle: 'Deltoid', region: 'Anterior deltoid', level: 'low', role: 'secondary' },
  ] },
  { test: /bench press|chest press|push.?up|chest fly|pec deck/i, items: [
    { muscle: 'Pectoralis major', region: 'Sternal head · Mid chest', level: 'high', role: 'primary' },
    { muscle: 'Deltoid', region: 'Anterior deltoid · Front shoulder', level: 'moderate', role: 'secondary' },
    { muscle: 'Triceps brachii', region: 'Lateral and medial heads', level: 'moderate', role: 'secondary' },
  ] },
  { test: /lateral raise|side raise/i, items: [
    { muscle: 'Deltoid', region: 'Lateral head · Side shoulder', level: 'high', role: 'primary' },
    { muscle: 'Deltoid', region: 'Anterior head · Front shoulder', level: 'low', role: 'secondary' },
    { muscle: 'Supraspinatus', region: 'Rotator cuff', level: 'low', role: 'secondary' },
  ] },
  { test: /reverse fly|rear delt|face pull/i, items: [
    { muscle: 'Deltoid', region: 'Posterior head · Rear shoulder', level: 'high', role: 'primary' },
    { muscle: 'Rhomboids', region: 'Mid upper back', level: 'moderate', role: 'secondary' },
    { muscle: 'Trapezius', region: 'Middle and lower fibers', level: 'moderate', role: 'secondary' },
  ] },
  { test: /shoulder press|overhead press|arnold press/i, items: [
    { muscle: 'Deltoid', region: 'Anterior head · Front shoulder', level: 'high', role: 'primary' },
    { muscle: 'Deltoid', region: 'Lateral head · Side shoulder', level: 'moderate', role: 'secondary' },
    { muscle: 'Triceps brachii', region: 'All three heads', level: 'moderate', role: 'secondary' },
  ] },
  { test: /hammer curl/i, items: [
    { muscle: 'Brachialis', region: 'Deep elbow flexor', level: 'high', role: 'primary' },
    { muscle: 'Brachioradialis', region: 'Forearm', level: 'high', role: 'primary' },
    { muscle: 'Biceps brachii', region: 'Long and short heads', level: 'moderate', role: 'secondary' },
  ] },
  { test: /curl|preacher/i, items: [
    { muscle: 'Biceps brachii', region: 'Long head · Outer biceps', level: 'high', role: 'primary' },
    { muscle: 'Biceps brachii', region: 'Short head · Inner biceps', level: 'high', role: 'primary' },
    { muscle: 'Brachialis', region: 'Deep elbow flexor', level: 'moderate', role: 'secondary' },
  ] },
  { test: /overhead.*extension|skull crusher|french press/i, items: [
    { muscle: 'Triceps brachii', region: 'Long head', level: 'high', role: 'primary' },
    { muscle: 'Triceps brachii', region: 'Lateral head', level: 'moderate', role: 'secondary' },
    { muscle: 'Triceps brachii', region: 'Medial head', level: 'moderate', role: 'secondary' },
  ] },
  { test: /pushdown|tricep.*press/i, items: [
    { muscle: 'Triceps brachii', region: 'Lateral head', level: 'high', role: 'primary' },
    { muscle: 'Triceps brachii', region: 'Medial head', level: 'high', role: 'primary' },
    { muscle: 'Triceps brachii', region: 'Long head', level: 'moderate', role: 'secondary' },
  ] },
  { test: /lat pulldown|pull.?up|chin.?up/i, items: [
    { muscle: 'Latissimus dorsi', region: 'Lats · Outer back', level: 'high', role: 'primary' },
    { muscle: 'Teres major', region: 'Upper outer back', level: 'moderate', role: 'secondary' },
    { muscle: 'Biceps brachii', region: 'Long and short heads', level: 'moderate', role: 'secondary' },
  ] },
  { test: /row/i, items: [
    { muscle: 'Rhomboids', region: 'Between shoulder blades', level: 'high', role: 'primary' },
    { muscle: 'Trapezius', region: 'Middle fibers · Mid back', level: 'high', role: 'primary' },
    { muscle: 'Latissimus dorsi', region: 'Lats · Outer back', level: 'moderate', role: 'secondary' },
    { muscle: 'Deltoid', region: 'Posterior head · Rear shoulder', level: 'moderate', role: 'secondary' },
  ] },
  { test: /leg extension/i, items: [
    { muscle: 'Quadriceps', region: 'Rectus femoris', level: 'high', role: 'primary' },
    { muscle: 'Quadriceps', region: 'Vastus lateralis · Outer quad', level: 'high', role: 'primary' },
    { muscle: 'Quadriceps', region: 'Vastus medialis · Inner quad', level: 'high', role: 'primary' },
    { muscle: 'Quadriceps', region: 'Vastus intermedius · Deep quad', level: 'high', role: 'primary' },
  ] },
  { test: /leg curl/i, items: [
    { muscle: 'Hamstrings', region: 'Biceps femoris · Outer hamstring', level: 'high', role: 'primary' },
    { muscle: 'Hamstrings', region: 'Semitendinosus and semimembranosus', level: 'high', role: 'primary' },
  ] },
  { test: /squat|lunge|leg press/i, items: [
    { muscle: 'Quadriceps', region: 'All four heads · Front thigh', level: 'high', role: 'primary' },
    { muscle: 'Gluteus maximus', region: 'Glutes', level: 'high', role: 'primary' },
    { muscle: 'Adductors', region: 'Inner thigh', level: 'moderate', role: 'secondary' },
    { muscle: 'Hamstrings', region: 'Back thigh', level: 'low', role: 'secondary' },
  ] },
  { test: /calf raise/i, items: [
    { muscle: 'Gastrocnemius', region: 'Upper / visible calf', level: 'high', role: 'primary' },
    { muscle: 'Soleus', region: 'Deep lower calf', level: 'moderate', role: 'secondary' },
  ] },
  { test: /hip thrust|glute bridge/i, items: [
    { muscle: 'Gluteus maximus', region: 'Main glute muscle', level: 'high', role: 'primary' },
    { muscle: 'Hamstrings', region: 'Back thigh', level: 'moderate', role: 'secondary' },
    { muscle: 'Adductor magnus', region: 'Inner / rear thigh', level: 'low', role: 'secondary' },
  ] },
]

export function getExerciseActivation(exercise) {
  if (Array.isArray(exercise.muscle_activation) && exercise.muscle_activation.length) return exercise.muscle_activation
  const name = exercise.name || ''
  const match = activationDefaults.find(item => item.test.test(name))
  if (match) return match.items
  const primary = (exercise.primary_muscles || []).map(muscle => ({
    muscle,
    region: `${muscle} · General target area`,
    level: 'high',
    role: 'primary',
  }))
  const secondary = (exercise.secondary_muscles || []).map(muscle => ({
    muscle,
    region: `${muscle} · Supporting muscle`,
    level: 'moderate',
    role: 'secondary',
  }))
  return [...primary, ...secondary]
}

