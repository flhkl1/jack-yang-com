/**
 * Application configuration and constants
 */

export const CONFIG = {
  PROMPT: 'jack@profile:~$ ',
  SUDO_PROMPT_PREFIX: '[sudo] password for ',
  SUDO_USER: 'jack',
  ASCII_DELAY_MS: 5,
  PHOTO_DELAY_MS: 300,
  STARTUP_TOTAL_TIME_MS: 1000,
  PHOTO_FILENAME_DELAY_MS: 100,
};

export const WHO_TEXT = `I'm a senior @ UC Berkeley interested in commercially viable AI applications. 
I'm currently researching multimodal LLMs for dementia diagnosis @ UCSF.
Previously, I was a SDE @ Amazon on Infra and Ops for AWS' Anthropic partnership, 
and worked on InfraAI investment theses with Hong Kong's Ocean Arete Fund at the outset of the GenAI boom.
In my free time, I enjoy cooking, playing and watching sports, and learning languages.
`;

export const COMMAND_ALIASES = {
  w: 'who',
  b: 'blog',
  cv: 'resume',
  cw: 'coursework',
};

export const WELCOME_MESSAGE = [
  '',
  'Welcome to my website!',
  "Type 'help' to see the list of available commands.",
  '',
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
  '',
];
