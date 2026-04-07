import Swal from 'sweetalert2';

const ShowConfirmationDeclareVat = async (): Promise<boolean> => {
    const result = await Swal.fire({
        html: `
            <div style="margin-bottom: 20px; font-size: 21px; font-weight: bold; text-align: center;">
                Are you sure?
            </div>
            <div style="font-size: 16px; text-align: center;">
                You want to declare this invoice to VAT!
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: 'rgb(219, 19, 19)',
        confirmButtonText: 'Yes, declare it!',
        width: '20%', // Adjust width for a smaller box
        customClass: {
            popup: 'custom-swal-popup', // Add a custom class to the popup
        },
        didRender: () => {
            const confirmButton = document.querySelector('.swal2-confirm');
            if (confirmButton) {
                // Apply inline style for red background
                (confirmButton as HTMLElement).style.backgroundColor = 'blue';
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

    return result.isConfirmed;
};

export default ShowConfirmationDeclareVat;
