/**
 * Command definitions and static data
 */

import { WHO_TEXT } from '../config.js';

/**
 * Coursework data organized by category
 */
const COURSEWORK = {
  math: [
    'MATH53 - Multivariable Calculus',
    'MATH54 - Linear Algebra and Differential Equations',
    'MATH104 - Introduction to Analysis',
    'MATH110 - Linear Algebra',
    'MATH113 - Abstract Algebra',
    'MATH128A - Numerical Analysis',
    'MATH185 - Complex Analysis',
  ],
  eecs: [
    'EECS127 - Optimization Models in Engineering',
    'CS61A - Structure and Interpretation of Computer Programs',
    'CS61B - Data Structures',
    'CS61C - Great Ideas in Computer Architecture (Machine Structures)',
    'CS70 - Discrete Mathematics and Probability Theory',
    'CS162 - Operating Systems and System Programming',
    'CS170 - Efficient Algorithms and Intractable Problems',
    'CS188 - Introduction to Artificial Intelligence',
    'CS189 - Introduction to Machine Learning',
  ],
  other: [
    'ECON101A - Microeconomics (Math Intensive)',
    'ECON101B - Macroeconomics',
    'STAT134 - Concepts of Probability',
  ],
};

/**
 * Formats coursework into display format
 * @returns {Array<string>} Formatted coursework lines
 */
function formatCoursework() {
  const result = [];
  COURSEWORK.math.forEach(course => result.push(`• ${course}`));
  result.push('');
  COURSEWORK.eecs.forEach(course => result.push(`• ${course}`));
  result.push('');
  COURSEWORK.other.forEach(course => result.push(`• ${course}`));
  return result;
}

/**
 * Help command output
 */
export const HELP_OUTPUT = [
  'Available Commands:',
  '[who] or [w]',
  '[blog] or [b]',
  '[resume] or [cv]',
  '[coursework] or [cw]',
  '[life]',
  '[clear]',
  '',
  'Contact Me:',
  '[email]',
  '[linkedin]',
  '[github]',
];

/**
 * Command definitions - static data only
 */
export const COMMAND_DEFINITIONS = {
  help: () => HELP_OUTPUT,
  who: () => WHO_TEXT.trim().split('\n').map(s => s.trim()).filter(Boolean),
  coursework: formatCoursework,
};
