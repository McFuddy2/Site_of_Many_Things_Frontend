import * as Dialog from "@radix-ui/react-dialog";
import '../HeaderStyling.css';

export default function HelpDialog({isMobile}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        { isMobile ? 
         (
          <button className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition mobile-nav-button-help-link">
            Help
          </button>
         ) : (
          <button className="sidebar-button-help">
            Help
          </button>
         )
        }
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold mb-2">
            Initiative Tracker
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-600 mb-4">
            Track combat order quickly. More tools coming soon.
          </Dialog.Description>

          <div className="flex justify-end">
            <Dialog.Close asChild>
              <button className="rounded bg-slate-900 px-3 py-1 text-white">
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
