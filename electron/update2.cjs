const fs = require('fs');
let content = fs.readFileSync('main.cjs', 'utf8');

// Update normalizeReminderState to keep 'completed' field
content = content.replace(
  /flowerId: typeof task\?\.flowerId === 'string' \? task\.flowerId : undefined,/,
  "flowerId: typeof task?.flowerId === 'string' ? task.flowerId : undefined,\n              completed: !!task?.completed,"
);

// We also need to change the check in scheduleReminderTimer so that it triggers even if all are completed.
// Wait, the timer triggers if reminderState.tasks.length > 0. If we send completed tasks in the array, length > 0 is still true!
// So just passing completed tasks in the payload is enough. No other changes to main.cjs needed!

fs.writeFileSync('main.cjs', content, 'utf8');
console.log('main.cjs updated');
