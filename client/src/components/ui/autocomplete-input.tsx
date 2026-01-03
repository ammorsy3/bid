import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
  maxLength?: number;
  type?: "input" | "textarea";
  rows?: number;
  onEnter?: () => void;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder = "",
  className = "",
  disabled = false,
  "data-testid": dataTestId,
  maxLength,
  type = "input",
  rows = 1,
  onEnter,
}: AutocompleteInputProps) {
  const [ghostText, setGhostText] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Find the best matching suggestion (1-2 words only)
  useEffect(() => {
    if (!value.trim() || disabled) {
      setGhostText("");
      return;
    }

    const lowercaseValue = value.toLowerCase();

    // Get the last word being typed (after the last space)
    const words = value.split(' ');
    const lastWord = words[words.length - 1].toLowerCase();

    // Check if user just typed a space (trailing space)
    const hasTrailingSpace = value.endsWith(' ') && lastWord === '';
    const previousWord = hasTrailingSpace && words.length >= 2
      ? words[words.length - 2].toLowerCase()
      : null;

    // If there's a trailing space, use the previous word for matching
    const wordToMatch = hasTrailingSpace && previousWord ? previousWord : lastWord;

    // Don't suggest if word to match is too short (less than 2 chars)
    if (wordToMatch.length < 2) {
      setGhostText("");
      return;
    }

    // Find suggestions that match
    const matches = suggestions
      .map(suggestion => {
        const suggestionLower = suggestion.toLowerCase();
        const suggestionWords = suggestionLower.split(' ');

        // Check if any word in the suggestion matches what we're typing
        for (let i = 0; i < suggestionWords.length; i++) {
          const suggestionWord = suggestionWords[i];

          // Case 1: Last word is being completed (partial match)
          if (suggestionWord.startsWith(wordToMatch) && suggestionWord !== wordToMatch && !hasTrailingSpace) {
            const completedWord = suggestionWord;
            const nextWord = i < suggestionWords.length - 1 ? suggestionWords[i + 1] : null;

            return {
              completion: completedWord + (nextWord ? ' ' + nextWord : ''),
              relevance: i === 0 ? 3 : 2, // Higher relevance for start of phrase
              isPartialMatch: true,
              matchedWord: completedWord,
            };
          }

          // Case 2: Last word is complete (exact match) - suggest next word
          // This handles both "email" and "email " (with trailing space)
          if (suggestionWord === wordToMatch) {
            const nextWord = i < suggestionWords.length - 1 ? suggestionWords[i + 1] : null;

            if (nextWord) {
              return {
                completion: nextWord,
                relevance: i === 0 ? 2 : 1,
                isPartialMatch: false,
                matchedWord: suggestionWord,
                hasTrailingSpace,
              };
            }
          }
        }

        return null;
      })
      .filter((match): match is {
        completion: string;
        relevance: number;
        isPartialMatch: boolean;
        matchedWord: string;
        hasTrailingSpace?: boolean;
      } => match !== null)
      .sort((a, b) => b.relevance - a.relevance);

    if (matches.length > 0) {
      const bestMatch = matches[0];

      if (bestMatch.isPartialMatch) {
        // Complete the current word + optionally add next word
        const matchWords = bestMatch.completion.split(' ');
        const currentWordCompletion = matchWords[0].slice(wordToMatch.length);
        const secondWord = matchWords[1] ? ' ' + matchWords[1] : '';
        setGhostText(currentWordCompletion + secondWord);
      } else {
        // Current word is complete, suggest next word
        // If there's already a trailing space, don't add another one
        const prefix = bestMatch.hasTrailingSpace ? '' : ' ';
        setGhostText(prefix + bestMatch.completion);
      }
    } else {
      setGhostText("");
    }
  }, [value, suggestions, disabled]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Accept ghost text on Tab press
    if (e.key === "Tab" && ghostText) {
      e.preventDefault();
      onChange(value + ghostText);
      setGhostText("");
    }

    // Handle Enter key
    if (e.key === "Enter" && onEnter && type === "input") {
      e.preventDefault();
      onEnter();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const commonClasses =
    "w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E25E45] focus:border-transparent disabled:opacity-50";

  return (
    <div className="relative w-full">
      {/* Ghost text overlay */}
      {ghostText && (
        <div
          className={cn(
            "absolute inset-0 pointer-events-none",
            type === "textarea" ? "resize-none" : ""
          )}
          style={{
            padding: "0.75rem 1rem",
            color: "transparent",
            whiteSpace: type === "textarea" ? "pre-wrap" : "nowrap",
            overflow: "hidden",
          }}
        >
          <span className="invisible">{value}</span>
          <span className="text-gray-400 dark:text-gray-500">{ghostText}</span>
        </div>
      )}

      {/* Actual input */}
      {type === "input" ? (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          data-testid={dataTestId}
          className={cn(commonClasses, className, "relative z-10 bg-transparent")}
          style={{ caretColor: "auto" }}
        />
      ) : (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={rows}
          data-testid={dataTestId}
          className={cn(commonClasses, className, "relative z-10 bg-transparent resize-none")}
          style={{ caretColor: "auto" }}
        />
      )}

      {/* Tab hint */}
      {ghostText && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-300 dark:border-gray-600">
            Tab to accept
          </span>
        </div>
      )}
    </div>
  );
}
