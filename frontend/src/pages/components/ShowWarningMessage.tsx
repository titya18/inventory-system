import Swal from 'sweetalert2';

const ShowWarningMessage = async (textData: string): Promise<boolean> => {
    return new Promise((resolve) => {
        Swal.fire({
            html: `
                <div style="margin-bottom: 20px; font-size: 21px; font-weight: bold; text-align: center;">
                    Warning!
                </div>
                <div style="font-size: 16px; text-align: center;">
                    ${textData}
                </div>
            `,
            icon: 'warning',
            showConfirmButton: true,
            confirmButtonText: 'OK',
            width: '20%',
            customClass: {
                popup: 'custom-swal-popup',
            },
            didRender: () => {
                const confirmButton = document.querySelector('.swal2-confirm');
                if (confirmButton) {
                    (confirmButton as HTMLElement).style.backgroundColor = 'red';
                    (confirmButton as HTMLElement).style.color = 'white';
                    (confirmButton as HTMLElement).style.border = 'none';
                    (confirmButton as HTMLElement).style.boxShadow = 'none';
                }

                const styleElement = document.createElement('style');
                styleElement.innerHTML = `
                    .swal2-icon:not(.swal2-error):not(.swal2-success) {
                        margin-bottom: 0 !important;
                    }
                    :is([dir="ltr"] .swal2-popup .swal2-html-container) {
                        padding-right: 0 !important;
                    }
                `;
                document.head.appendChild(styleElement);
            },
        });
    });
};

export default ShowWarningMessage;
