export const PAGE_VARIANTS = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.25, 0, 1],
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.25, 0, 1],
    },
  },
};

export const HEADER_VARIANTS = {
  initial: { opacity: 0, y: -20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.25, 0, 1],
      delay: 0.1,
    },
  },
};

export const CONTAINER_VARIANTS = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.3,
    },
  },
};

export const CARD_VARIANTS = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.25, 0, 1],
    },
  },
};

// CodeBlock animation constants
export const CODE_BLOCK_ANIMATIONS = {
  EXPAND_DURATION: 300,
  BUTTON_SCALE_HOVER: 1.05,
  BUTTON_SCALE_ACTIVE: 0.95,
  CONTENT_OPACITY_ANIMATION: 200,
  ICON_ROTATION_DURATION: 200,
  FADE_OVERLAY_DURATION: 300,
  TRUNCATED_HEIGHT: '240px',
};

export const TRANSITION_DELAY = 300;
