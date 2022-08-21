import * as forgerock from './forgerock-sdk.js'

const FATAL = 'Fatal';
forgerock.Config.set({
    clientId: 'ForgeRockSDKClient',
    redirectUri: 'http://localhost:8181/_callback',
    scope: 'openid profile',
    serverConfig: {
        baseUrl: 'https://openam.example.com/openam/',
        timeout: 50000,
    },
    realmPath: 'bravo',
    tree: 'Login'
});

// Define custom handlers to render and submit each expected step
const handlers = {
    UsernamePassword: (step) => {
        const panel = document.querySelector('#UsernamePassword');
        panel.querySelector('.btn').addEventListener('click', () => {
            const nameCallback = step.getCallbackOfType('NameCallback');
            const passwordCallback = step.getCallbackOfType('PasswordCallback');
            nameCallback.setName(panel.querySelector('input[type=text]').value);
            passwordCallback.setPassword(panel.querySelector('input[type=password]').value);
            nextStep(step);
        });
    },
    Error: (step) => {
        // document.querySelector('#Error span').innerHTML = step.getCode();
        document.getElementById('Error').style.visibility = 'visible';
        document.getElementById("username").value = '';
        document.getElementById("password").value = '';
    },
    [FATAL]: (step) => {},
};

// Show only the view for this handler
const showStep = (handler) => {
    document.querySelectorAll('#steps > div').forEach((x) => x.classList.remove('active'));
    const panel = document.getElementById(handler);
    if (!panel) {
        console.error(`No panel with ID "${handler}"" found`);
        return false;
    }
    // document.getElementById(handler).classList.add('active');
    return true;
};

const logout = async () => {
    try {
        await forgerock.FRUser.logout();
        location.reload(true);
    } catch (error) {
        console.error(error);
    }
};

const showLoggedIn = () => {
    console.log('You are logged in')
    const panel = document.querySelector('#displayLoggedIn');
    panel.querySelector('.btn').addEventListener('click', () => {
        logout();
    });
};

const getStage = (step) => {
    // Check if the step contains callbacks for capturing username and password
    const usernameCallbacks = step.getCallbacksOfType('NameCallback');
    const passwordCallbacks = step.getCallbacksOfType('PasswordCallback');

    if (usernameCallbacks.length && passwordCallbacks.length) {
        return 'UsernamePassword';
    }

    return undefined;
};

// Display and bind the handler for this stage
const handleStep = async (step) => {
    switch (step.type) {
        case 'LoginSuccess': {
            // If we have a session token, get user information
            const sessionToken = step.getSessionToken();
            if (sessionToken !== null) {
                const usernamePassword = document.getElementById("UsernamePassword").style.visibility = 'hidden';
                const displayLoggedIn = document.getElementById("displayLoggedIn").style.visibility = 'visible';
                document.getElementById('Error').style.visibility = 'hidden';
            }

            return showLoggedIn();
        }

        case 'LoginFailure': {
            console.log('Login failed');
            showStep('Error');
            handlers['Error'](step);
            return;
        }

        default: {
            const stage = getStage(step) || FATAL;
            if (!showStep(stage)) {
                showStep(FATAL);
                handlers[FATAL](step);
            } else {
                handlers[stage](step);
            }
        }
    }
};

const handleFatalError = (err) => {
    console.error('Fatal error', err);
    showStep(FATAL);
};

// Get the next step using the FRAuth API
const nextStep = (step) => {
    // forgerock.FRAuth.next(step).then(handleStep).catch(handleFatalError);
    forgerock.FRAuth.next(step).then(handleStep);
};



// Begin the login flow
nextStep();