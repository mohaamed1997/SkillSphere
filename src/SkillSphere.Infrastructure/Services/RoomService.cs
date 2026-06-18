using Microsoft.EntityFrameworkCore;
using SkillSphere.Application.Common;
using SkillSphere.Application.DTOs.Rooms;
using SkillSphere.Application.Interfaces;
using SkillSphere.Domain.Entities;
using SkillSphere.Domain.Enums;
using SkillSphere.Infrastructure.Persistence;

namespace SkillSphere.Infrastructure.Services;

public class RoomService : IRoomService
{
    private readonly SkillSphereDbContext _db;
    public RoomService(SkillSphereDbContext db) => _db = db;

    public async Task<Result<List<RoomDto>>> GetRoomsAsync(Guid tenantId, RoomType? type, CancellationToken ct)
    {
        var q = _db.Rooms.Where(r => r.SchoolTenantId == tenantId);
        if (type.HasValue) q = q.Where(r => r.RoomType == type.Value);

        var items = await q.OrderBy(r => r.Code).Select(r => new RoomDto
        {
            Id = r.Id, Name = r.Name, NameAr = r.NameAr, Code = r.Code, RoomType = r.RoomType,
            Capacity = r.Capacity, Building = r.Building, Floor = r.Floor, IsActive = r.IsActive
        }).ToListAsync(ct);
        return Result<List<RoomDto>>.Success(items);
    }

    public async Task<Result<RoomDto>> CreateAsync(Guid tenantId, CreateRoomRequest req, CancellationToken ct)
    {
        if (await _db.Rooms.AnyAsync(r => r.SchoolTenantId == tenantId && r.Code == req.Code, ct))
            return Result<RoomDto>.Failure($"Room code '{req.Code}' already exists.");

        var room = new Room
        {
            Name = req.Name, NameAr = req.NameAr, Code = req.Code, RoomType = req.RoomType,
            Capacity = req.Capacity, Building = req.Building, Floor = req.Floor,
            SchoolTenantId = tenantId
        };
        await _db.Rooms.AddAsync(room, ct);
        await _db.SaveChangesAsync(ct);

        return Result<RoomDto>.Success(new RoomDto
        {
            Id = room.Id, Name = room.Name, NameAr = room.NameAr, Code = room.Code, RoomType = room.RoomType,
            Capacity = room.Capacity, Building = room.Building, Floor = room.Floor, IsActive = true
        });
    }

    public async Task<Result<RoomDto>> UpdateAsync(Guid id, UpdateRoomRequest req, CancellationToken ct)
    {
        var room = await _db.Rooms.FindAsync([id], ct);
        if (room == null) return Result<RoomDto>.Failure("Room not found.");

        if (await _db.Rooms.AnyAsync(r => r.SchoolTenantId == room.SchoolTenantId && r.Code == req.Code && r.Id != id, ct))
            return Result<RoomDto>.Failure($"Room code '{req.Code}' already exists.");

        room.Name = req.Name; room.NameAr = req.NameAr; room.Code = req.Code; room.RoomType = req.RoomType;
        room.Capacity = req.Capacity; room.Building = req.Building; room.Floor = req.Floor;
        await _db.SaveChangesAsync(ct);

        return Result<RoomDto>.Success(new RoomDto
        {
            Id = room.Id, Name = room.Name, NameAr = room.NameAr, Code = room.Code, RoomType = room.RoomType,
            Capacity = room.Capacity, Building = room.Building, Floor = room.Floor, IsActive = room.IsActive
        });
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct)
    {
        var room = await _db.Rooms.FindAsync([id], ct);
        if (room == null) return Result.Failure("Room not found.");
        room.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }
}
