import React, { useRef, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const IssueReporter = () => {
  const { 
    register, 
    control, 
    handleSubmit, 
    formState: { errors, isSubmitting }, 
    setError,
    clearErrors,
    reset 
  } = useForm({
    defaultValues: {
      issueTitle: '',
      steps: [{ value: '' }]
    }
  });
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'steps'
  });
  
  const stepRefs = useRef([]);

  const stepPlaceholders = [
    "First step: What happened?",
    "Then what happened?",
    "What was the result?",
    "What did you expect to happen?",
    "What happened instead?",
    "Any additional details?",
    "What environment were you using?",
    "How can this be reproduced?",
    "What's the impact of this issue?",
    "Any workarounds you've tried?"
  ];

  const addStep = () => {
    append({ value: '' });
    setTimeout(() => {
      const newIndex = fields.length;
      if (stepRefs.current[newIndex]) {
        stepRefs.current[newIndex].focus();
      }
    }, 100);
  };

  const handleKeyPress = (e, index) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addStep();
    }
  };

  const formatEmailBody = (data) => {
    const nonEmptySteps = data.steps
      .map((step, index) => ({ step: step.value.trim(), originalIndex: index + 1 }))
      .filter(item => item.step);
    
    let body = `Issue: ${data.issueTitle}\n\n`;
    body += 'Steps:\n';
    nonEmptySteps.forEach((item, index) => {
      body += `${index + 1}. ${item.step}\n`;
    });
    
    return body;
  };

  const onSubmit = async (data) => {
    // Validate that at least one step has content
    const hasValidSteps = data.steps.some(step => step.value.trim());
    
    if (!hasValidSteps) {
      setError('steps', { 
        type: 'manual', 
        message: 'Please provide at least one step.' 
      });
      return;
    }

    clearErrors();

    try {
      // Save to Firebase Firestore
      const issueData = {
        title: data.issueTitle,
        steps: data.steps
          .filter(step => step.value.trim())
          .map(step => step.value.trim()),
        recipientEmail: process.env.REACT_APP_RECIPIENT_EMAIL,
        createdAt: serverTimestamp(),
        status: 'open'
      };

      const docRef = await addDoc(collection(db, 'issues'), issueData);
      console.log('Issue saved with ID:', docRef.id);

      // Also open email client as backup
      const recipientEmail = process.env.REACT_APP_RECIPIENT_EMAIL;
      const emailBody = formatEmailBody(data);
      
      const subject = encodeURIComponent(data.issueTitle);
      const body = encodeURIComponent(emailBody);
      const mailtoUrl = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
      
      window.location.href = mailtoUrl;

      // Reset form on success
      reset();
      
    } catch (error) {
      console.error('Submission error:', error);
      setError('root', { 
        type: 'manual', 
        message: 'Failed to submit issue. Please try again.' 
      });
    }
  };

  useEffect(() => {
    stepRefs.current = stepRefs.current.slice(0, fields.length);
  }, [fields.length]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Issue Reporter</h1>
            <p className="text-gray-600">Break down the issue into steps</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="issueTitle" className="block text-sm font-medium text-gray-700 mb-2">
                Issue Title
              </label>
              <input
                id="issueTitle"
                type="text"
                {...register('issueTitle', { 
                  required: 'Issue title is required',
                  minLength: { 
                    value: 3, 
                    message: 'Issue title must be at least 3 characters' 
                  }
                })}
                placeholder="Brief description of the issue..."
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.issueTitle ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
              {errors.issueTitle && (
                <p className="mt-1 text-sm text-red-600">{errors.issueTitle.message}</p>
              )}
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-4 group">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  
                  <input
                    ref={el => stepRefs.current[index] = el}
                    type="text"
                    {...register(`steps.${index}.value`)}
                    onKeyDown={(e) => handleKeyPress(e, index)}
                    placeholder={stepPlaceholders[index] || `Step ${index + 1}...`}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    disabled={isSubmitting}
                  />
                  
                  <button
                    type="button"
                    onClick={addStep}
                    disabled={isSubmitting}
                    className="flex-shrink-0 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Step
                  </button>
                </div>
              ))}
              {errors.steps && (
                <p className="text-sm text-red-600">{errors.steps.message}</p>
              )}
            </div>

            {errors.root && (
              <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
                {errors.root.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Issue'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default IssueReporter;