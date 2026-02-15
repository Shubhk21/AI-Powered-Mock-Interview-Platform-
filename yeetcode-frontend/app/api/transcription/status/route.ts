export async function GET() {
    try {
        const response = await fetch('http://localhost:8080/api/transcription/status');
        const data = await response.json();
        
        return Response.json(data);
    } catch (error) {
        return Response.json(
        { error: 'Failed to fetch transcription status' },
        { status: 500 }
        );
    }
}
