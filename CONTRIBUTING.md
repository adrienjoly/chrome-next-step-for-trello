# Contribution Guidelines

:+1::tada: First off, thanks for considering to do a contribution! :tada::+1:

This document proposes guidelines for contributing to this repository.

The objectives of the guidelines are:

- Make sure that contributing is an enjoyable experience, and that contributors are respected. (e.g. avoid waste of time and other deceptive experiences)
- Make sure that the quality of the codebase increases over time. (or at least remains stable)
- Make sure that contributions solve more problems than they create. (e.g. a "fix" that was not tested properly will cause long discussions)

These are just guidelines, not rules, use your best judgment and feel free to propose changes to this document in a pull request.

## What to contribute

You can contribute in various ways:

- Fix bugs listed on [the project's backlog](https://github.com/adrienjoly/chrome-next-step-for-trello/projects/1)
- Submit issues for bugs you (or other users) found while using Next Step for Trello ([example](https://github.com/adrienjoly/chrome-next-step-for-trello/issues/57))

## How to contribute to the code base

0. Fork this repository to your own Github account
1. Clone your fork to your computer
2. Assign the Github issue you're working on (after creating it, if necessary) to yourself, on [the project's backlog](https://github.com/adrienjoly/chrome-next-step-for-trello/projects/1)
3. Make changes in your local copy of the code, test it, commit, then submit a Pull Request
4. Be available to reply during the reviewing process of your PR.

## Acceptance criteria for Pull Requests (PR)

- A PR must contain only one modification. Any PR with more than one independant modification will be rejected. (e.g. "cleaned .gitignore and added installation guide" are two independant PR)
- A PR must solve an identified and immediate problem. Any PR that intends to solve a future problem will be rejected. (e.g. "added a rule for running tests", even though there are no tests yet in the project)
- A PR must not break any functionality of the product. Every precaution (e.g. writing and running automated tests) must be taken to avoid that.

## Core principles

More generally, make sure to follow these three principles:
- Keep your PRs short (i.e. minimal number of changed lines)
- Keep your PRs simple
- Avoid submitting PRs that may cause long discussions with the PR reviewer and/or other contributors

🤗 Beginners, you are welcome too! Don't be afraid, sending a PR is a great way to learn. You will probably be reassured by this article: [How To Win Friends And Make Pull Requests On GitHub](http://readwrite.com/2014/07/02/github-pull-request-etiquette/).

## Code guidelines

- Optimize for search: [Like in the React.js project](https://facebook.github.io/react/contributing/design-principles.html), we want to make it easy for contributors to search for symbols (constants, variables and function names. So don't hesitate to give them verbose/specific names.
