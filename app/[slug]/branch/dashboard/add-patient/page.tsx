import PatientForm from "@/components/PatientForm/PatientForm";
import addPatient from "./actions";

export default function AddPatientPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg">
        <PatientForm onSubmit={addPatient} />
      </div>
    </div>
  );
}
