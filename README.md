# Upcoming Features
## v.1
• (All desired features have been completed!)
## v.1.1
• Static Conditions Modal
• Edit Settings Modal
• Add a note explaining that the Conditions are using 2024 Rules
• Cookies so the stuff is saved even after the browser is closed.
• Remove condition expiration to be brought back in a different version
## v.2
• Make it so that we can have breaks in the description of the custom conditions
• QOL key strokes (hot keys for next/back, etc)
   • Keys Right Arrow, D, Enter, or SpaceBar would do the Next button, and adding Keys Left Arrow, S, and Backspace would do the Back button
• Add an option for quantity when adding characters
• Have it when you click "Next", they move to the bottom of the list so that the current turn is always on top.
• Semi-transparent gradient to the top if we are scrolled down and there are names at the top that aren't being shown. 
• Web Aim Contrast Checker (can use to tell how easy it is to read something)
• Search function in custom conditions area to quickly find conditions when there are a lot of custom conditions added
• Option to select multiple (or all) custom conditions to be deleted from the list
## v.3
• Bring back condition expirations
• Have conditions automatically go away after a certain amount of time as specified with expiration
• Pictures of the characters next to the name
• Maybe include a picture in the Conditions area? (optional)
• Clump creatures that take their turn at the same time (similar to how they have it set up in Gloomhaven)
## v.4
• Add a option in the settings to choose the theme
## v.5 
• DM view and Player view

# Environment Notes

This frontend is intended to run locally against the Railway spell-search backend by default.

- Normal workflow: run `npm start` and use the Railway API.
- Local backend testing: create a `.env.local` file with `VITE_API_BASE_URL=http://localhost:8000`.
- Do not change `.env` for temporary local testing; `.env.local` is already ignored and will not affect other work.

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
