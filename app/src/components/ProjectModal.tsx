import { Fragment, useState, useRef, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Tag {
  id: number;
  text: string;
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectData: {
    name: string;
    description: string;
    is_private: boolean;
    tags: string;
  }) => void;
}

export default function ProjectModal({ isOpen, onClose, onSubmit }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState('');
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setName('');
      setDescription('');
      setIsPrivate(false);
      setTagInput('');
      setTags([]);
      setError('');
    }
  }, [isOpen]);

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // If the last character is a comma, create a new tag
    if (value.endsWith(',')) {
      const tagText = value.slice(0, -1).trim();
      if (tagText && tags.length < 5 && !tags.some(tag => tag.text === tagText)) {
        setTags([...tags, { id: Date.now(), text: tagText }]);
        setTagInput('');
      } else {
        // If tag is empty or already exists, just remove the comma
        setTagInput(value.slice(0, -1));
      }
    } else {
      setTagInput(value);
    }
  };

  const addTag = () => {
    const text = tagInput.trim();
    if (text && tags.length < 5 && !tags.some(tag => tag.text === text)) {
      setTags([...tags, { id: Date.now(), text }]);
      setTagInput('');
    }
  };

  const removeTag = (id: number) => {
    setTags(tags.filter(tag => tag.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    // Add current tag input if it exists
    if (tagInput.trim()) {
      addTag();
    }

    // Convert tags array to comma-separated string
    const tagsString = tags.map(tag => tag.text).join(',');

    onSubmit({
      name,
      description,
      is_private: isPrivate,
      tags: tagsString
    });
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        initialFocus={cancelButtonRef}
        onClose={onClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 transition-opacity" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }} />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div>
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Create New Project
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Fill in the details below to create a new project.
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-5 sm:mt-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="project-name" className="block text-sm font-medium text-gray-700">
                        Project Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="project-name"
                        id="project-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                        placeholder="My Amazing Project"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="project-description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="project-description"
                        name="project-description"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                        placeholder="Describe your project..."
                      />
                    </div>

                    <div>
                      <label htmlFor="project-tags" className="block text-sm font-medium text-gray-700">
                        Tags (up to 5)
                      </label>
                      <input
                        type="text"
                        name="project-tags"
                        id="project-tags"
                        value={tagInput}
                        onChange={handleTagInputChange}
                        onKeyDown={handleKeyDown}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                        placeholder="Enter tags separated by commas"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Enter tag names separated by commas. Press Enter or type a comma to add a tag.
                      </p>

                      {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800"
                            >
                              {tag.text}
                              <button
                                type="button"
                                onClick={() => removeTag(tag.id)}
                                className="ml-1.5 inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full text-purple-400 hover:bg-purple-200 hover:text-purple-500 focus:bg-purple-500 focus:text-white focus:outline-none"
                              >
                                <span className="sr-only">Remove tag {tag.text}</span>
                                <svg
                                  className="h-2 w-2"
                                  stroke="currentColor"
                                  fill="none"
                                  viewBox="0 0 8 8"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeWidth="1.5"
                                    d="M1 1l6 6m0-6L1 7"
                                  />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center">
                      <input
                        id="is-private"
                        name="is-private"
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <label htmlFor="is-private" className="ml-2 block text-sm text-gray-700">
                        Make project private
                      </label>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="submit"
                      className="inline-flex w-full justify-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 sm:col-start-2"
                    >
                      Create Project
                    </button>
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                      onClick={onClose}
                      ref={cancelButtonRef}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 