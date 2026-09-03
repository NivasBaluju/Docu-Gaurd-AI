import React from 'react';
import { Link } from 'react-router-dom';

/**
 * TextLink — Part 8.4
 * Underlined by default (1px --ink, 3px offset).
 * Thickens to 2px on hover.
 */
export function TextLink({
  href,
  children,
  className = '',
  external = false,
  ...props
}) {
  const classes = `editorial-link font-body text-body text-ink transition-all duration-fast ${className}`;

  if (external || (href && href.startsWith('http'))) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className={classes} {...props}>
      {children}
    </Link>
  );
}

export default TextLink;
