const CURRENT_PRIVACY_NOTICE_VERSION =
    '1.0';

document.addEventListener(
    'DOMContentLoaded',
    () => {
        const enableButton =
            document.getElementById(
                'enable-yomisaver'
            );

        const status =
            document.getElementById(
                'welcome-status'
            );

        if (
            !enableButton ||
            !status
        ) {
            return;
        }

        enableButton.addEventListener(
            'click',
            () => {
                enableButton.disabled =
                    true;

                enableButton.textContent =
                    'Enabling…';

                status.textContent = '';

                chrome.runtime.sendMessage(
                    {
                        action:
                            'acknowledgePrivacy',
                        noticeVersion:
                            CURRENT_PRIVACY_NOTICE_VERSION
                    },
                    response => {
                        if (
                            chrome.runtime
                                .lastError
                        ) {
                            showError(
                                chrome.runtime
                                    .lastError
                                    .message
                            );

                            return;
                        }

                        if (
                            !response?.success ||
                            !response
                                ?.acknowledged
                        ) {
                            showError(
                                response?.error ||
                                'YomiSaver could ' +
                                'not be enabled.'
                            );

                            return;
                        }

                        enableButton.textContent =
                            'YomiSaver is ready';

                        status.textContent =
                            'Setup complete. ' +
                            'You can close this tab ' +
                            'and start reading.';

                        status.classList.add(
                            'success'
                        );
                    }
                );
            }
        );

        function showError(message) {
            enableButton.disabled =
                false;

            enableButton.textContent =
                'Try again';

            status.textContent =
                `Unable to enable YomiSaver: ` +
                message;

            status.classList.remove(
                'success'
            );

            status.classList.add(
                'error'
            );
        }
    }
);